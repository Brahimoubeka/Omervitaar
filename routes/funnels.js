const express = require('express');
const router = express.Router();
const pool = require('../db');
const supabase = require('../supabase');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const { sendCachedJson, invalidateFunnelsCache } = require('../utils/cache');

// Upload buffer to Supabase Storage (product-images bucket) and return public URL
async function uploadFunnelMediaToSupabase(fileName, buffer, mimetype) {
  const { error } = await supabase.storage.from('product-images').upload(fileName, buffer, {
    contentType: mimetype,
    upsert: true
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// Robust verifyAdmin helper that checks cookies, authorization headers, and raw cookie headers
function verifyAdmin(req, res, next) {
  let token = req.cookies?.token;
  if (!token && req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  }
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول كمسؤول' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'ممنوع - هذه الخاصية متاحة للمسؤولين فقط' });
    }
    req.user = decoded;
    next();
  });
}

// Helper to generate a clean URL slug from title
function generateSlug(text) {
  if (!text) return 'item-' + Date.now();
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0621-\u064A0-9\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || ('item-' + Date.now());
}

function toLocalMedia(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    return url.replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\//, '/images/storage/');
  }
  if (url.startsWith('/uploads/funnels/')) {
    const webpPath = url.replace(/\.(jpeg|jpg|png|jfif)$/i, '.webp');
    const localWebpFsPath = path.join(__dirname, '..', 'public', webpPath);
    if (fs.existsSync(localWebpFsPath)) {
      return webpPath;
    }
    const localOrigFsPath = path.join(__dirname, '..', 'public', url);
    if (!fs.existsSync(localOrigFsPath)) {
      return '';
    }
  }
  return url;
}

function normalizeBlockMedia(block) {
  if (!block || typeof block !== 'object') return block;
  if (block.content && typeof block.content === 'object') {
    const c = block.content;
    if (c.image_url) c.image_url = toLocalMedia(c.image_url);
    if (c.video_url) c.video_url = toLocalMedia(c.video_url);
    if (c.before_image) c.before_image = toLocalMedia(c.before_image);
    if (c.after_image) c.after_image = toLocalMedia(c.after_image);
    if (Array.isArray(c.images)) {
      c.images = c.images.map(img => (typeof img === 'string' ? toLocalMedia(img) : (img && img.url ? { ...img, url: toLocalMedia(img.url) } : img)));
    }
    if (Array.isArray(c.items)) {
      c.items = c.items.map(item => {
        if (!item || typeof item !== 'object') return item;
        const copy = { ...item };
        if (copy.image_url) copy.image_url = toLocalMedia(copy.image_url);
        if (copy.avatar_url) copy.avatar_url = toLocalMedia(copy.avatar_url);
        return copy;
      });
    }
  }
  if (block.product_data && block.product_data.image) {
    block.product_data.image = toLocalMedia(block.product_data.image);
  }
  return block;
}

function normalizeOfferMedia(offer) {
  if (!offer || typeof offer !== 'object') return offer;
  if (offer.image_url) offer.image_url = toLocalMedia(offer.image_url);
  if (offer.product_image) offer.product_image = toLocalMedia(offer.product_image);
  if (Array.isArray(offer.images)) {
    offer.images = offer.images.map(img => toLocalMedia(img));
  }
  return offer;
}

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

/**
 * GET /api/funnels/home-featured
 * Returns active root funnel nodes marked for display on the home page
 */
router.get('/funnels/home-featured', async (req, res) => {
  try {
    await sendCachedJson(req, res, 'funnels', 'home-featured', async () => {
      const { rows } = await pool.query(`
        SELECT id, parent_id, slug, title, subtitle, image_url, button_text, type, settings, order_index
        FROM public.funnel_nodes
        WHERE parent_id IS NULL AND is_active = true AND show_on_home = true
        ORDER BY order_index ASC, id ASC
      `);

      // For each root node, also fetch direct active sub-sections to display as quick tags or count
      return await Promise.all(rows.map(async (node) => {
        const { rows: subNodes } = await pool.query(`
          SELECT id, slug, title, subtitle, image_url, button_text, type
          FROM public.funnel_nodes
          WHERE parent_id = $1 AND is_active = true
          ORDER BY order_index ASC, id ASC
          LIMIT 6
        `, [node.id]);
        return {
          ...node,
          image_url: toLocalMedia(node.image_url),
          sub_sections: subNodes.map(s => ({ ...s, image_url: toLocalMedia(s.image_url) }))
        };
      }));
    });
  } catch (err) {
    console.error('Error fetching home featured funnels:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل الأقسام المميزة' });
  }
});

/**
 * GET /api/funnels/node/:slug
 * Retrieves a funnel node by slug with its breadcrumbs and:
 * - If type === 'section': child nodes
 * - If type === 'landing_page': blocks & offers
 */
router.get('/funnels/node/:slug', async (req, res) => {
  let rawSlug = req.params.slug;
  let decodedSlug = rawSlug;
  try {
    decodedSlug = decodeURIComponent(rawSlug);
    if (decodedSlug.includes('%')) {
      decodedSlug = decodeURIComponent(decodedSlug);
    }
  } catch (e) {}

  let encodedSlug = rawSlug;
  try {
    encodedSlug = encodeURIComponent(decodedSlug);
  } catch (e) {}

  try {
    await sendCachedJson(req, res, 'funnels', `node:${decodedSlug}`, async () => {
      // 1. Fetch node by matching raw, decoded, or encoded slug
      const { rows: nodeRows } = await pool.query(`
        SELECT * FROM public.funnel_nodes
        WHERE (slug = $1 OR slug = $2 OR slug = $3 OR slug ILIKE $2) AND is_active = true
        LIMIT 1
      `, [rawSlug, decodedSlug, encodedSlug]);

      if (nodeRows.length === 0) {
        res.status(404).json({ error: 'القسم أو صفحة الهبوط غير موجودة' });
        return undefined;
      }

      const node = nodeRows[0];

      // 2. Build breadcrumb chain (traverse parents)
      const breadcrumbs = [];
      let currentParentId = node.parent_id;
      while (currentParentId) {
        const { rows: parentRows } = await pool.query(`
          SELECT id, parent_id, slug, title, type
          FROM public.funnel_nodes
          WHERE id = $1
        `, [currentParentId]);
        if (parentRows.length === 0) break;
        breadcrumbs.unshift(parentRows[0]);
        currentParentId = parentRows[0].parent_id;
      }

      let children = [];
      let blocks = [];
      let offers = [];

      if (node.type === 'section') {
        // 3a. If section, fetch child nodes with settings
        const { rows: childRows } = await pool.query(`
          SELECT id, parent_id, slug, title, subtitle, image_url, button_text, type, order_index, settings
          FROM public.funnel_nodes
          WHERE parent_id = $1 AND is_active = true
          ORDER BY order_index ASC, id ASC
        `, [node.id]);
        children = childRows;
      } else {
        // 3b. If landing_page, fetch blocks
        const { rows: blockRows } = await pool.query(`
          SELECT id, node_id, block_type, title, content, styles, order_index
          FROM public.landing_page_blocks
          WHERE node_id = $1 AND is_active = true
          ORDER BY order_index ASC, id ASC
        `, [node.id]);
        blocks = blockRows;

        // Enrich product_card blocks with real-time product data if product_id is specified
        for (const block of blocks) {
          if (block.block_type === 'product_card' && block.content?.product_id) {
            try {
              const { rows: prodRows } = await pool.query(`
                SELECT 
                  p.id, p.name, p.price,
                  COALESCE(p."imagePath", (SELECT "imagePath" FROM public."ProductImages" WHERE product_id = p.id LIMIT 1), '/images/category-banner-oil.jpg') as image,
                  p.stock, p.is_free_delivery, p.description,
                  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 5.0) as avg_rating,
                  COUNT(r.id)::int as review_count,
                  (
                    SELECT string_agg(c.name, ' • ')
                    FROM public."ProductCategories" pc
                    JOIN public."Categories" c ON c.id = pc.category_id
                    WHERE pc.product_id = p.id
                  ) as category_names
                FROM public."Products" p
                LEFT JOIN public."Reviews" r ON r.product_id = p.id
                WHERE p.id = $1
                GROUP BY p.id
              `, [block.content.product_id]);
              if (prodRows.length > 0) {
                block.product_data = prodRows[0];
              }
            } catch (e) {
              console.warn('Could not fetch product for block:', e.message);
            }
          }
        }

        // 4. Fetch offers
        const { rows: offerRows } = await pool.query(`
          SELECT o.*, p.name as product_name, p."imagePath" as product_image
          FROM public.landing_page_offers o
          LEFT JOIN public."Products" p ON p.id = o.product_id
          WHERE o.node_id = $1
          ORDER BY o.order_index ASC, o.id ASC
        `, [node.id]);
        offers = offerRows;
      }

      node.image_url = toLocalMedia(node.image_url);
      children = children.map(c => ({ ...c, image_url: toLocalMedia(c.image_url) }));
      blocks = blocks.map(normalizeBlockMedia);
      offers = offers.map(normalizeOfferMedia);

      return {
        node,
        breadcrumbs,
        children,
        blocks,
        offers
      };
    });
  } catch (err) {
    console.error('Error fetching funnel node:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات الصفحة' });
  }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * GET /api/admin/funnels/tree
 * Returns all funnel nodes in hierarchical tree format with stats
 */
router.get('/admin/funnels/tree', verifyAdmin, async (req, res) => {
  try {
    const { rows: allNodes } = await pool.query(`
      SELECT n.*,
        (SELECT COUNT(*) FROM public.funnel_nodes c WHERE c.parent_id = n.id) as children_count,
        (SELECT COUNT(*) FROM public.landing_page_blocks b WHERE b.node_id = n.id) as blocks_count,
        (SELECT COUNT(*) FROM public.landing_page_offers o WHERE o.node_id = n.id) as offers_count
      FROM public.funnel_nodes n
      ORDER BY n.parent_id NULLS FIRST, n.order_index ASC, n.id ASC
    `);

    // Helper to build recursive tree
    const nodeMap = {};
    const rootNodes = [];

    allNodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
    });

    allNodes.forEach(node => {
      if (node.parent_id && nodeMap[node.parent_id]) {
        nodeMap[node.parent_id].children.push(nodeMap[node.id]);
      } else {
        rootNodes.push(nodeMap[node.id]);
      }
    });

    res.json({
      tree: rootNodes,
      all: allNodes
    });
  } catch (err) {
    console.error('Error fetching admin funnels tree:', err);
    res.status(500).json({ error: 'فشل تحميل هيكل الأقسام' });
  }
});

/**
 * GET /api/admin/funnels/node/:id
 * Returns a single node with its blocks and offers for editing
 */
router.get('/admin/funnels/node/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: nodeRows } = await pool.query(
      'SELECT * FROM public.funnel_nodes WHERE id = $1',
      [id]
    );
    if (nodeRows.length === 0) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }

    const node = nodeRows[0];

    const { rows: blocks } = await pool.query(
      'SELECT * FROM public.landing_page_blocks WHERE node_id = $1 ORDER BY order_index ASC, id ASC',
      [id]
    );

    const { rows: offers } = await pool.query(`
      SELECT o.*, p.name as product_name 
      FROM public.landing_page_offers o
      LEFT JOIN public."Products" p ON p.id = o.product_id
      WHERE o.node_id = $1 
      ORDER BY o.order_index ASC, o.id ASC
    `, [id]);

    res.json({
      node,
      blocks,
      offers
    });
  } catch (err) {
    console.error('Error fetching admin funnel node:', err);
    res.status(500).json({ error: 'فشل تحميل بيانات القسم' });
  }
});

/**
 * POST /api/admin/funnels/node
 * Creates a new funnel node (Section or Landing Page)
 */
router.post('/admin/funnels/node', verifyAdmin, async (req, res) => {
  const {
    parent_id,
    slug: rawSlug,
    title,
    subtitle,
    image_url,
    button_text,
    type = 'section',
    order_index = 0,
    is_active = true,
    show_on_home = false,
    meta_title,
    meta_description,
    settings = {}
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'عنوان القسم أو الصفحة مطلوب' });
  }

  let slug = rawSlug ? generateSlug(rawSlug) : generateSlug(title);

  try {
    // Check slug uniqueness
    const { rows: existing } = await pool.query(
      'SELECT id FROM public.funnel_nodes WHERE slug = $1',
      [slug]
    );
    if (existing.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const { rows } = await pool.query(`
      INSERT INTO public.funnel_nodes (
        parent_id, slug, title, subtitle, image_url, button_text, type,
        order_index, is_active, show_on_home, meta_title, meta_description, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      parent_id ? parseInt(parent_id, 10) : null,
      slug,
      title.trim(),
      subtitle ? subtitle.trim() : null,
      image_url || null,
      button_text ? button_text.trim() : 'اكتشف الحل',
      type,
      parseInt(order_index, 10) || 0,
      is_active !== false,
      Boolean(show_on_home),
      meta_title || null,
      meta_description || null,
      typeof settings === 'object' ? settings : {}
    ]);

    const newNode = rows[0];
    invalidateFunnelsCache();

    // New landing pages start completely blank as requested
    res.status(201).json(newNode);
  } catch (err) {
    console.error('Error creating funnel node:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء القسم' });
  }
});

/**
 * PUT /api/admin/funnels/node/:id
 * Updates an existing funnel node
 */
router.put('/admin/funnels/node/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    parent_id,
    slug: rawSlug,
    title,
    subtitle,
    image_url,
    button_text,
    type,
    order_index,
    is_active,
    show_on_home,
    meta_title,
    meta_description,
    settings
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'عنوان القسم مطلوب' });
  }

  try {
    let slug = rawSlug ? generateSlug(rawSlug) : generateSlug(title);

    // Check slug uniqueness excluding self
    const { rows: existing } = await pool.query(
      'SELECT id FROM public.funnel_nodes WHERE slug = $1 AND id != $2',
      [slug, id]
    );
    if (existing.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const { rows } = await pool.query(`
      UPDATE public.funnel_nodes
      SET
        parent_id = $1,
        slug = $2,
        title = $3,
        subtitle = $4,
        image_url = $5,
        button_text = $6,
        type = $7,
        order_index = $8,
        is_active = $9,
        show_on_home = $10,
        meta_title = $11,
        meta_description = $12,
        settings = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      parent_id ? parseInt(parent_id, 10) : null,
      slug,
      title.trim(),
      subtitle ? subtitle.trim() : null,
      image_url || null,
      button_text ? button_text.trim() : 'اكتشف الحل',
      type || 'section',
      parseInt(order_index, 10) || 0,
      is_active !== false,
      Boolean(show_on_home),
      meta_title || null,
      meta_description || null,
      typeof settings === 'object' ? settings : {},
      id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }

    invalidateFunnelsCache();
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating funnel node:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تعديل القسم' });
  }
});

/**
 * DELETE /api/admin/funnels/node/:id
 * Deletes a funnel node (cascades children, blocks, and offers via foreign keys)
 */
router.delete('/admin/funnels/node/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'DELETE FROM public.funnel_nodes WHERE id = $1 RETURNING id, title',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }
    invalidateFunnelsCache();
    res.json({ message: 'تم حذف القسم وجميع العناصر المرتبطة به بنجاح', deleted: rows[0] });
  } catch (err) {
    console.error('Error deleting funnel node:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف القسم' });
  }
});

/**
 * PUT /api/admin/funnels/blocks/:nodeId
 * Atomically replaces all landing page blocks for a node
 */
router.put('/admin/funnels/blocks/:nodeId', verifyAdmin, async (req, res) => {
  const { nodeId } = req.params;
  const { blocks } = req.body;

  if (!Array.isArray(blocks)) {
    return res.status(400).json({ error: 'يجب توفير قائمة الكتل بتنسيق صحيح' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing blocks
    await client.query('DELETE FROM public.landing_page_blocks WHERE node_id = $1', [nodeId]);

    // Insert new blocks with order
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      await client.query(`
        INSERT INTO public.landing_page_blocks (
          node_id, block_type, title, content, styles, order_index, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        nodeId,
        b.block_type || 'text',
        b.title || '',
        typeof b.content === 'object' ? JSON.stringify(b.content) : (b.content || '{}'),
        typeof b.styles === 'object' ? JSON.stringify(b.styles) : (b.styles || '{}'),
        i,
        b.is_active !== false
      ]);
    }

    await client.query('COMMIT');

    const { rows: savedBlocks } = await client.query(
      'SELECT * FROM public.landing_page_blocks WHERE node_id = $1 ORDER BY order_index ASC',
      [nodeId]
    );

    invalidateFunnelsCache();
    res.json({ message: 'تم حفظ وتحديث كتل صفحة الهبوط بنجاح', blocks: savedBlocks });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving landing page blocks:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ كتل الصفحة' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/admin/funnels/offers/:nodeId
 * Atomically replaces all bundle offers for a landing page
 */
router.put('/admin/funnels/offers/:nodeId', verifyAdmin, async (req, res) => {
  const { nodeId } = req.params;
  const { offers } = req.body;

  if (!Array.isArray(offers)) {
    return res.status(400).json({ error: 'يجب توفير قائمة العروض بتنسيق صحيح' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing offers
    await client.query('DELETE FROM public.landing_page_offers WHERE node_id = $1', [nodeId]);

    // Insert new offers
    for (let i = 0; i < offers.length; i++) {
      const o = offers[i];
      const rawImages = Array.isArray(o.images) ? o.images : (o.image_url ? [o.image_url] : []);
      const imagesJson = JSON.stringify(rawImages);
      const settingsJson = JSON.stringify(o.settings && typeof o.settings === 'object' ? o.settings : {});
      const primaryImg = rawImages.length > 0 ? rawImages[0] : (o.image_url || null);

      await client.query(`
        INSERT INTO public.landing_page_offers (
          node_id, product_id, title, badge, quantity, price, original_price,
          free_delivery, is_popular, image_url, images, settings, order_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        nodeId,
        o.product_id ? parseInt(o.product_id, 10) : null,
        o.title || 'عرض خاص',
        o.badge || null,
        parseInt(o.quantity, 10) || 1,
        parseFloat(o.price) || 0,
        o.original_price ? parseFloat(o.original_price) : null,
        Boolean(o.free_delivery),
        Boolean(o.is_popular),
        primaryImg,
        imagesJson,
        settingsJson,
        i
      ]);
    }

    await client.query('COMMIT');

    const { rows: savedOffers } = await client.query(`
      SELECT o.*, p.name as product_name
      FROM public.landing_page_offers o
      LEFT JOIN public."Products" p ON p.id = o.product_id
      WHERE o.node_id = $1
      ORDER BY o.order_index ASC
    `, [nodeId]);

    invalidateFunnelsCache();
    res.json({ message: 'تم حفظ وتحديث باقات العروض بنجاح', offers: savedOffers });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving landing page offers:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ باقات العروض' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/funnels/upload-images
 * Accepts single or multiple images from device, optimizes them to WebP via sharp,
 * uploads them to permanent Supabase Storage, and returns edge-cached URLs.
 */
router.post('/admin/funnels/upload-images', verifyAdmin, (req, res) => {
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'funnels');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new formidable.IncomingForm({
    uploadDir: uploadDir,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB max
    multiples: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing uploaded images:', err);
      return res.status(500).json({ error: 'فشل في معالجة الصور المرفوعة' });
    }

    const allFiles = [];
    Object.keys(files).forEach(key => {
      const item = files[key];
      if (Array.isArray(item)) {
        allFiles.push(...item);
      } else if (item) {
        allFiles.push(item);
      }
    });

    if (allFiles.length === 0) {
      return res.status(400).json({ error: 'لم يتم استلام أي صور صالحة' });
    }

    const allowedImageTypes = /^image\/(jpeg|jpg|png|webp|gif|avif|bmp|tiff)$/i;
    const uploadedUrls = [];

    try {
      for (const f of allFiles) {
        if (!f || !f.filepath) continue;
        const mime = f.mimetype || '';
        const origName = f.originalFilename || f.newFilename || '';
        const isAllowedExt = /\.(jpe?g|png|webp|gif|jfif|avif)$/i.test(origName);

        if (mime && !allowedImageTypes.test(mime) && !isAllowedExt) {
          fs.unlink(f.filepath, () => {});
          continue;
        }

        const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        let buffer;
        let storageFileName;
        let contentType = 'image/webp';

        if (/\.gif$/i.test(origName) || mime === 'image/gif') {
          buffer = await fs.promises.readFile(f.filepath);
          storageFileName = `funnels/funnel_${uniqueId}.gif`;
          contentType = 'image/gif';
        } else {
          buffer = await sharp(f.filepath)
            .rotate()
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          storageFileName = `funnels/funnel_${uniqueId}.webp`;
        }

        const publicUrl = await uploadFunnelMediaToSupabase(storageFileName, buffer, contentType);
        uploadedUrls.push(toLocalMedia(publicUrl));

        // Clean up temporary local file
        fs.unlink(f.filepath, () => {});
      }

      if (uploadedUrls.length === 0) {
        return res.status(400).json({ error: 'لم يتم استلام أي صور بصيغة مدعومة' });
      }

      res.json({
        message: 'تم رفع الصور بنجاح',
        urls: uploadedUrls,
        primaryUrl: uploadedUrls[0]
      });
    } catch (uploadErr) {
      console.error('Error uploading funnel images to Supabase Storage:', uploadErr);
      allFiles.forEach(f => {
        if (f && f.filepath) fs.unlink(f.filepath, () => {});
      });
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ الصور في التخزين السحابي' });
    }
  });
});

/**
 * POST /api/admin/funnels/upload-video
 * Accepts single video file (mp4, webm, mov, etc.) up to 50MB,
 * uploads to permanent Supabase Storage, and returns edge-cached URL.
 */
router.post('/admin/funnels/upload-video', verifyAdmin, (req, res) => {
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'videos');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new formidable.IncomingForm({
    uploadDir: uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB max for cloud storage safety
    multiples: false
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing uploaded video:', err);
      return res.status(500).json({ error: 'فشل في رفع ملف الفيديو. يرجى التأكد من الحجم (أقل من 50MB)' });
    }

    const videoFile = files.video || files.file;
    let target = null;
    if (Array.isArray(videoFile)) {
      target = videoFile[0];
    } else if (videoFile) {
      target = videoFile;
    }

    if (!target || !target.filepath) {
      return res.status(400).json({ error: 'لم يتم استلام أي ملف فيديو' });
    }

    const mime = target.mimetype || 'video/mp4';
    const origName = target.originalFilename || target.newFilename || 'video.mp4';
    const extMatch = origName.match(/\.(mp4|webm|ogg|mov)$/i);
    if (!/^video\//i.test(mime) && !extMatch) {
      fs.unlink(target.filepath, () => {});
      return res.status(400).json({ error: 'صيغة الفيديو غير مدعومة' });
    }

    try {
      const ext = extMatch ? extMatch[0].toLowerCase() : '.mp4';
      const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const storageFileName = `funnels/videos/video_${uniqueId}${ext}`;
      const buffer = await fs.promises.readFile(target.filepath);

      const publicUrl = await uploadFunnelMediaToSupabase(storageFileName, buffer, mime);
      fs.unlink(target.filepath, () => {});

      res.json({
        message: 'تم رفع الفيديو بنجاح',
        url: toLocalMedia(publicUrl)
      });
    } catch (uploadErr) {
      console.error('Error uploading funnel video to Supabase Storage:', uploadErr);
      fs.unlink(target.filepath, () => {});
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ الفيديو في التخزين السحابي' });
    }
  });
});

module.exports = { router };
