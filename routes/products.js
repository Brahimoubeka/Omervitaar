const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const SlugUtil = require('../utils/slug-util');

// Helper: Get categories for product
async function getCategoriesForProduct(productId) {
  const { data, error } = await supabase
    .from('ProductCategories')
    .select('category_id, Categories(id, name)')
    .eq('product_id', productId);
  if (error) throw error;
  return (data || []).filter(row => row.Categories).map(row => ({ id: row.Categories.id, name: row.Categories.name }));
}

// Helper: Get first image for product
async function getFirstImageForProduct(productId) {
  const { data, error } = await supabase
    .from('ProductImages')
    .select('imagePath')
    .eq('product_id', productId)
    .order('id', { ascending: true })
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0].imagePath : null;
}

// Helper: Get average rating and review count for a product
async function getProductRatingStats(productId) {
  // Ensure productId is a number for the query
  const pid = Number(productId);
  // Fetch all ratings for this product
  const { data: ratings, error } = await supabase
    .from('Reviews')
    .select('rating')
    .eq('product_id', pid);
  if (error) throw error;
  let avgRating = null;
  let reviewCount = 0;
  if (ratings && ratings.length > 0) {
    const ratingNumbers = ratings.map(r => Number(r.rating)).filter(r => !isNaN(r));
    if (ratingNumbers.length > 0) {
      avgRating = ratingNumbers.reduce((sum, r) => sum + r, 0) / ratingNumbers.length;
      reviewCount = ratingNumbers.length;
    }
  }
  return { avgRating, reviewCount };
}

// Helper: Batch fetch and map related data for products
async function enrichProducts(products) {
  if (!products || products.length === 0) return [];

  const productIds = products.map(p => p.id);

  // Fetch all categories for these products
  const { data: catRows } = await supabase
    .from('ProductCategories')
    .select('product_id, Categories(id, name)')
    .in('product_id', productIds);

  // Fetch all images for these products
  const { data: imgRows } = await supabase
    .from('ProductImages')
    .select('product_id, imagePath, id')
    .in('product_id', productIds);

  // Fetch all ratings for these products
  const { data: ratingRows } = await supabase
    .from('Reviews')
    .select('product_id, rating')
    .in('product_id', productIds);

  // Map categories, images, and ratings to products
  const catMap = {};
  (catRows || []).forEach(row => {
    if (!catMap[row.product_id]) catMap[row.product_id] = [];
    if (row.Categories) catMap[row.product_id].push({ id: row.Categories.id, name: row.Categories.name });
  });

  const imgMap = {};
  (imgRows || []).forEach(row => {
    if (!imgMap[row.product_id]) imgMap[row.product_id] = [];
    imgMap[row.product_id].push({ imagePath: row.imagePath, id: row.id });
  });

  const ratingMap = {};
  (ratingRows || []).forEach(row => {
    if (!ratingMap[row.product_id]) ratingMap[row.product_id] = [];
    ratingMap[row.product_id].push(Number(row.rating));
  });

  // Attach to each product
  products.forEach(product => {
    product.categories = catMap[product.id] || [];
    const images = (imgMap[product.id] || []).sort((a, b) => a.id - b.id).map(i => i.imagePath);
    product.images = images.length > 0 ? images : (product.imagePath ? [product.imagePath] : []);
    product.thumbnail = product.images[0] || product.imagePath || 'images/default-product.jpg';
    const ratings = ratingMap[product.id] || [];
    product.avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    product.reviewCount = ratings.length;
    // Ensure name/description are strings
    product.name = Array.isArray(product.name) ? (product.name[0] || '') : (product.name || '');
    product.description = Array.isArray(product.description) ? (product.description[0] || '') : (product.description || '');
    // Add slug for clean URLs
    product.slug = SlugUtil.generateProductSlug(product);
  });

  return products;
}

// GET /api/products
router.get('/products', async (req, res) => {
  const { category, limit } = req.query;
  try {
    let products = [];
    if (category) {
      const { data: pcData } = await supabase
        .from('ProductCategories')
        .select('product_id')
        .eq('category_id', category);
      const productIds = (pcData || []).map(pc => pc.product_id);
      if (productIds.length === 0) return res.json([]);
      const { data } = await supabase
        .from('Products')
        .select('*')
        .in('id', productIds)
        .neq('is_active', false)
        .order('id', { ascending: false })
        .limit(limit || 3);
      products = data;
    } else {
      const { data } = await supabase.from('Products').select('*').neq('is_active', false);
      products = data;
    }
    const enriched = await enrichProducts(products);
    res.json(enriched);
  } catch (err) {
    console.error('Error retrieving product:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/products/paginate?offset=0&limit=8&category=ID
router.get('/products/paginate', async (req, res) => {
  let { offset, limit, category } = req.query;
  offset = parseInt(offset, 10) || 0;
  limit = parseInt(limit, 10) || 8;
  try {
    let products = [];
    if (category) {
      const { data: pcData } = await supabase
        .from('ProductCategories')
        .select('product_id')
        .eq('category_id', category);
      let productIds = (pcData || []).map(pc => pc.product_id);
      if (productIds.length === 0) return res.json([]);
      const pagedIds = productIds.slice(offset, offset + limit);
      if (pagedIds.length === 0) return res.json([]);
      const { data } = await supabase
        .from('Products')
        .select('*')
        .in('id', pagedIds)
        .neq('is_active', false)
        .order('id', { ascending: false });
      products = pagedIds.map(id => data.find(p => p.id === id)).filter(Boolean);
    } else {
      const { data } = await supabase
        .from('Products')
        .select('*')
        .neq('is_active', false)
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);
      products = data;
    }
    const enriched = await enrichProducts(products);
    res.json(enriched);
  } catch (err) {
    console.error('Error in /products/paginate:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/products/latest
router.get('/products/latest', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Products')
      .select('*')
      .neq('is_active', false)
      .order('id', { ascending: false })
      .limit(2);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Son ürünler alınırken veritabanı hatası.' });
  }
});

// GET /api/products/:identifier (accepts both ID and slug)
router.get('/products/:identifier', async (req, res) => {
  const identifier = req.params.identifier;
  let productId;

  // Check if identifier is a slug or ID
  if (SlugUtil.isValidSlug(identifier)) {
    productId = SlugUtil.extractIdFromSlug(identifier);
  } else {
    productId = parseInt(identifier, 10);
  }

  if (!productId || isNaN(productId)) {
    return res.status(400).json({ error: 'معرف المنتج غير صالح' });
  }

  try {
    // Fetch product row
    const { data: prodRows, error: prodError } = await supabase
      .from('Products')
      .select('*')
      .eq('id', productId);
    if (prodError) throw prodError;
    const row = prodRows[0];
    if (!row) return res.status(404).json({ error: 'لم يتم العثور على المنتج' });

    // Batch fetch related data
    const [catRows, imgRows, ratingRows] = await Promise.all([
      supabase
        .from('ProductCategories')
        .select('category_id, Categories(id, name)')
        .eq('product_id', productId),
      supabase
        .from('ProductImages')
        .select('imagePath, id')
        .eq('product_id', productId)
        .order('id', { ascending: true }),
      supabase
        .from('Reviews')
        .select('rating')
        .eq('product_id', productId)
    ]);

    // Categories
    row.categories = (catRows.data || []).filter(r => r.Categories).map(r => ({ id: r.Categories.id, name: r.Categories.name }));
    // Images
    const images = (imgRows.data || []).sort((a, b) => a.id - b.id).map(i => i.imagePath);
    row.images = images.length > 0 ? images : (row.imagePath ? [row.imagePath] : []);
    row.thumbnail = row.images[0] || row.imagePath || 'images/default-product.jpg';
    // Ratings
    const ratings = (ratingRows.data || []).map(r => Number(r.rating)).filter(r => !isNaN(r));
    row.avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    row.reviewCount = ratings.length;
    // Ensure name/description are strings
    row.name = Array.isArray(row.name) ? (row.name[0] || '') : (row.name || '');
    row.description = Array.isArray(row.description) ? (row.description[0] || '') : (row.description || '');

    // Add slug to response
    row.slug = SlugUtil.generateProductSlug(row);

    res.json(row);
  } catch (err) {
    console.error('Error retrieving product:', err);
    res.status(500).json({ error: 'خطأ أثناء جلب المنتج' });
  }
});

// GET /api/products/:id/images
router.get('/products/:id/images', async (req, res) => {
  const productId = req.params.id;
  try {
    const { data, error } = await supabase
      .from('ProductImages')
      .select('imagePath')
      .eq('product_id', productId)
      .order('id', { ascending: true });
    if (error) throw error;
    res.json((data || []).map(row => row.imagePath));
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Categories')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;

    // Add slugs to categories
    const categoriesWithSlugs = (data || []).map(category => ({
      ...category,
      slug: SlugUtil.generateCategorySlug(category)
    }));

    res.json(categoriesWithSlugs);
  } catch (err) {
    res.status(500).json({ error: 'Kategoriler alınırken hata oluştu.' });
  }
});

// Record a product visit (guest or logged-in user)
router.post('/products/:id/visit', async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  let userId = null;
  if (req.user && req.user.id) userId = req.user.id;
  try {
    const { error } = await supabase
      .from('ProductVisits')
      .insert([{ product_id: productId, user_id: userId }]);
    if (error) throw error;
    res.json({ message: "Visit recorded" });
  } catch (err) {
    console.error("Error recording visit:", err);
    res.status(500).json({ error: 'Error recording visit' });
  }
});

module.exports = router;
