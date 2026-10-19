const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Middleware to verify admin access
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
  if (!token) {
    return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'ممنوع - للمشرفين فقط' });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Core Helper: Check free delivery status for cart items
 * Checks storewide setting and individual product is_free_delivery flags
 */
async function checkFreeDeliveryEligibility(items = []) {
  try {
    // 1. Check storewide setting
    const { rows: ssRows } = await pool.query(
      'SELECT storewide_free_delivery FROM public.site_settings LIMIT 1'
    );
    const storewide = ssRows.length > 0 && Boolean(ssRows[0].storewide_free_delivery);
    if (storewide) {
      return { isFreeDelivery: true, reason: 'storewide' };
    }

    // 2. Check individual products
    if (items && items.length > 0) {
      const itemIds = items.map(i => parseInt(i.id, 10)).filter(id => !isNaN(id));
      if (itemIds.length > 0) {
        const { rows: prodRows } = await pool.query(
          'SELECT id, is_free_delivery FROM public."Products" WHERE id = ANY($1::int[]) AND is_free_delivery = true',
          [itemIds]
        );
        if (prodRows.length > 0) {
          return { isFreeDelivery: true, reason: 'product', freeProductIds: prodRows.map(p => p.id) };
        }
      }
    }

    return { isFreeDelivery: false, reason: 'none' };
  } catch (err) {
    console.error('Error checking free delivery eligibility:', err);
    return { isFreeDelivery: false, reason: 'error' };
  }
}

/**
 * Core Helper: Validate and calculate discount for a promo code
 */
async function calculatePromoDiscount({ code, items = [], cartTotal = 0 }) {
  if (!code || !code.trim()) {
    return { valid: false, error: 'يرجى إدخال كود الخصم' };
  }

  const cleanCode = code.trim().toUpperCase();

  const { rows } = await pool.query(
    'SELECT * FROM public."PromoCodes" WHERE UPPER(code) = $1',
    [cleanCode]
  );

  if (rows.length === 0) {
    return { valid: false, error: 'كود الخصم غير موجود' };
  }

  const promo = rows[0];

  if (!promo.is_active) {
    return { valid: false, error: 'كود الخصم غير مفعل حالياً' };
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'انتهت صلاحية كود الخصم' };
  }

  if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
    return { valid: false, error: 'تم استنفاد الحد الأقصى لاستخدام كود الخصم' };
  }

  // Calculate eligible items and amount
  let eligibleItems = items;
  let eligibleAmount = 0;

  if (promo.applies_to === 'specific') {
    const { rows: specificRows } = await pool.query(
      'SELECT product_id FROM public."PromoCodeProducts" WHERE promo_code_id = $1',
      [promo.id]
    );
    const specificIds = new Set(specificRows.map(r => r.product_id));

    eligibleItems = items.filter(i => specificIds.has(parseInt(i.id, 10)));
    if (eligibleItems.length === 0) {
      return { valid: false, error: 'كود الخصم لا ينطبق على المنتجات المحددة في طلبك' };
    }
  }

  eligibleAmount = eligibleItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const qty = parseInt(item.quantity, 10) || 1;
    return sum + (price * qty);
  }, 0);

  if (promo.min_order_amount && eligibleAmount < parseFloat(promo.min_order_amount)) {
    return {
      valid: false,
      error: `الحد الأدنى للطلب لتفعيل هذا الكود هو ${promo.min_order_amount} دج للمنتجات المشمولة`
    };
  }

  let discountAmount = 0;
  let freeDelivery = false;

  if (promo.discount_type === 'free_delivery') {
    freeDelivery = true;
    discountAmount = 0;
  } else if (promo.discount_type === 'percentage') {
    const rate = parseFloat(promo.discount_value) || 0;
    discountAmount = Math.round((eligibleAmount * rate) / 100);
    if (promo.max_discount_amount && parseFloat(promo.max_discount_amount) > 0) {
      discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount));
    }
  } else if (promo.discount_type === 'fixed') {
    const fixed = parseFloat(promo.discount_value) || 0;
    discountAmount = Math.min(eligibleAmount, fixed);
  }

  return {
    valid: true,
    promoId: promo.id,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: parseFloat(promo.discount_value),
    discount_amount: discountAmount,
    free_delivery: freeDelivery,
    applies_to: promo.applies_to,
    eligible_amount: eligibleAmount,
    message: freeDelivery 
      ? `تم تطبيق كود (${promo.code}) بنجاح: توصيل مجاني!`
      : `تم تطبيق كود (${promo.code}) بنجاح: خصم ${discountAmount} دج`
  };
}

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// 1. POST /api/promo-codes/validate
router.post('/promo-codes/validate', async (req, res) => {
  try {
    const { code, items, cartTotal, deliveryCost } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ valid: false, error: 'يرجى إدخال كود الخصم' });
    }

    const promoResult = await calculatePromoDiscount({ code, items, cartTotal });
    if (!promoResult.valid) {
      return res.status(400).json(promoResult);
    }

    // Check free delivery status (either from promo or product/storewide)
    const freeDeliveryEligibility = await checkFreeDeliveryEligibility(items);
    const isFreeDelivery = promoResult.free_delivery || freeDeliveryEligibility.isFreeDelivery;

    const baseDelivery = parseFloat(deliveryCost) || 0;
    const finalDeliveryCost = isFreeDelivery ? 0 : baseDelivery;
    const totalItems = parseFloat(cartTotal) || items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity, 10) || 1), 0);
    const finalTotal = Math.max(0, totalItems - promoResult.discount_amount) + finalDeliveryCost;

    res.json({
      ...promoResult,
      is_free_delivery: isFreeDelivery,
      free_delivery_reason: promoResult.free_delivery ? 'promo' : freeDeliveryEligibility.reason,
      new_delivery_cost: finalDeliveryCost,
      new_final_total: finalTotal
    });
  } catch (err) {
    console.error('Error validating promo code:', err);
    res.status(500).json({ valid: false, error: 'حدث خطأ أثناء التحقق من كود الخصم' });
  }
});

// 2. GET /api/delivery/free-delivery-status
// Returns storewide flag and list of products with free delivery
router.get('/delivery/free-delivery-status', async (req, res) => {
  try {
    const { rows: ssRows } = await pool.query(
      'SELECT storewide_free_delivery FROM public.site_settings LIMIT 1'
    );
    const storewide = ssRows.length > 0 && Boolean(ssRows[0].storewide_free_delivery);

    const { rows: prodRows } = await pool.query(
      'SELECT id, name FROM public."Products" WHERE is_free_delivery = true AND is_active = true'
    );

    res.json({
      storewide_free_delivery: storewide,
      free_delivery_products: prodRows
    });
  } catch (err) {
    console.error('Error fetching free delivery status:', err);
    res.status(500).json({ error: 'خطأ في جلب بيانات التوصيل المجاني' });
  }
});

// ==========================================
// ADMIN ENDPOINTS: PROMO CODES
// ==========================================

// GET /api/admin/promo-codes
router.get('/admin/promo-codes', verifyAdmin, async (req, res) => {
  try {
    const query = `
      SELECT p.*,
             COALESCE(
               json_agg(
                 json_build_object('id', pr.id, 'name', pr.name)
               ) FILTER (WHERE pr.id IS NOT NULL), '[]'
             ) as products
      FROM public."PromoCodes" p
      LEFT JOIN public."PromoCodeProducts" pcp ON pcp.promo_code_id = p.id
      LEFT JOIN public."Products" pr ON pr.id = pcp.product_id
      GROUP BY p.id
      ORDER BY p.id DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching admin promo codes:', err);
    res.status(500).json({ error: 'خطأ في جلب كوبونات الخصم', details: err.message });
  }
});

// POST /api/admin/promo-codes
router.post('/admin/promo-codes', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      code, discount_type, discount_value, applies_to,
      product_ids, min_order_amount, max_discount_amount,
      usage_limit, expires_at, is_active
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'كود الخصم مطلوب' });
    }

    const cleanCode = code.trim().toUpperCase();
    const type = discount_type || 'percentage';
    const val = type === 'free_delivery' ? 0 : (parseFloat(discount_value) || 0);
    const applies = applies_to === 'specific' ? 'specific' : 'all';
    const minOrder = parseFloat(min_order_amount) || 0;
    const maxDiscount = max_discount_amount ? parseFloat(max_discount_amount) : null;
    const limit = usage_limit ? parseInt(usage_limit, 10) : null;
    const active = is_active !== false;
    const expiry = expires_at ? new Date(expires_at) : null;

    await client.query('BEGIN');

    // Check if code already exists
    const { rows: existing } = await client.query(
      'SELECT id FROM public."PromoCodes" WHERE UPPER(code) = $1',
      [cleanCode]
    );
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `كود الخصم (${cleanCode}) موجود مسبقاً` });
    }

    const insertQuery = `
      INSERT INTO public."PromoCodes"
        (code, discount_type, discount_value, applies_to, min_order_amount,
         max_discount_amount, usage_limit, expires_at, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const { rows: createdRows } = await client.query(insertQuery, [
      cleanCode, type, val, applies, minOrder, maxDiscount, limit, expiry, active
    ]);
    const created = createdRows[0];

    // If specific products, link them
    if (applies === 'specific' && Array.isArray(product_ids) && product_ids.length > 0) {
      for (const pid of product_ids) {
        await client.query(
          'INSERT INTO public."PromoCodeProducts" (promo_code_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [created.id, parseInt(pid, 10)]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'تم إنشاء كود الخصم بنجاح', promo: created });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating promo code:', err);
    res.status(500).json({ error: 'خطأ في إنشاء كود الخصم', details: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/admin/promo-codes/:id
router.put('/admin/promo-codes/:id', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'معرف غير صالح' });

    const {
      code, discount_type, discount_value, applies_to,
      product_ids, min_order_amount, max_discount_amount,
      usage_limit, expires_at, is_active
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'كود الخصم مطلوب' });
    }

    const cleanCode = code.trim().toUpperCase();
    const type = discount_type || 'percentage';
    const val = type === 'free_delivery' ? 0 : (parseFloat(discount_value) || 0);
    const applies = applies_to === 'specific' ? 'specific' : 'all';
    const minOrder = parseFloat(min_order_amount) || 0;
    const maxDiscount = max_discount_amount ? parseFloat(max_discount_amount) : null;
    const limit = usage_limit ? parseInt(usage_limit, 10) : null;
    const active = is_active !== false;
    const expiry = expires_at ? new Date(expires_at) : null;

    await client.query('BEGIN');

    // Check code duplication with other records
    const { rows: duplicate } = await client.query(
      'SELECT id FROM public."PromoCodes" WHERE UPPER(code) = $1 AND id != $2',
      [cleanCode, id]
    );
    if (duplicate.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `كود الخصم (${cleanCode}) مستخدم في كوبون آخر` });
    }

    const updateQuery = `
      UPDATE public."PromoCodes"
      SET code = $1, discount_type = $2, discount_value = $3, applies_to = $4,
          min_order_amount = $5, max_discount_amount = $6, usage_limit = $7,
          expires_at = $8, is_active = $9
      WHERE id = $10
      RETURNING *
    `;
    const { rows: updatedRows } = await client.query(updateQuery, [
      cleanCode, type, val, applies, minOrder, maxDiscount, limit, expiry, active, id
    ]);
    if (updatedRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'كود الخصم غير موجود' });
    }

    // Update specific products
    await client.query('DELETE FROM public."PromoCodeProducts" WHERE promo_code_id = $1', [id]);
    if (applies === 'specific' && Array.isArray(product_ids) && product_ids.length > 0) {
      for (const pid of product_ids) {
        await client.query(
          'INSERT INTO public."PromoCodeProducts" (promo_code_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, parseInt(pid, 10)]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'تم تحديث كود الخصم بنجاح', promo: updatedRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating promo code:', err);
    res.status(500).json({ error: 'خطأ في تحديث كود الخصم', details: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/admin/promo-codes/:id/toggle
router.put('/admin/promo-codes/:id/toggle', verifyAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await pool.query(
      'UPDATE public."PromoCodes" SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'كود الخصم غير موجود' });
    res.json({ message: 'تم تغيير حالة كود الخصم بنجاح', promo: rows[0] });
  } catch (err) {
    console.error('Error toggling promo code:', err);
    res.status(500).json({ error: 'خطأ في تغيير حالة كود الخصم' });
  }
});

// DELETE /api/admin/promo-codes/:id
router.delete('/admin/promo-codes/:id', verifyAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rowCount } = await pool.query('DELETE FROM public."PromoCodes" WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'كود الخصم غير موجود' });
    res.json({ message: 'تم حذف كود الخصم بنجاح' });
  } catch (err) {
    console.error('Error deleting promo code:', err);
    res.status(500).json({ error: 'خطأ في حذف كود الخصم' });
  }
});

// ==========================================
// ADMIN ENDPOINTS: FREE DELIVERY MANAGEMENT
// ==========================================

// GET /api/admin/free-delivery
router.get('/admin/free-delivery', verifyAdmin, async (req, res) => {
  try {
    const { rows: ssRows } = await pool.query(
      'SELECT storewide_free_delivery FROM public.site_settings LIMIT 1'
    );
    const storewide = ssRows.length > 0 && Boolean(ssRows[0].storewide_free_delivery);

    const { rows: products } = await pool.query(`
      SELECT id, name, price, stock, is_free_delivery, is_active
      FROM public."Products"
      ORDER BY id DESC
    `);

    res.json({
      storewide_free_delivery: storewide,
      products
    });
  } catch (err) {
    console.error('Error fetching admin free delivery status:', err);
    res.status(500).json({ error: 'خطأ في جلب بيانات التوصيل المجاني' });
  }
});

// PUT /api/admin/free-delivery/storewide
router.put('/admin/free-delivery/storewide', verifyAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    const isEnabled = Boolean(enabled);
    await pool.query(
      'UPDATE public.site_settings SET storewide_free_delivery = $1',
      [isEnabled]
    );
    res.json({
      message: isEnabled 
        ? 'تم تفعيل التوصيل المجاني لجميع المنتجات في المتجر!' 
        : 'تم إلغاء التوصيل المجاني الشامل للمتجر',
      storewide_free_delivery: isEnabled
    });
  } catch (err) {
    console.error('Error updating storewide free delivery:', err);
    res.status(500).json({ error: 'خطأ في تحديث إعداد التوصيل المجاني الشامل' });
  }
});

// PUT /api/admin/free-delivery/product/:id
router.put('/admin/free-delivery/product/:id', verifyAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const explicitState = req.body.is_free_delivery;
    const query = `
      UPDATE public."Products"
      SET is_free_delivery = CASE 
        WHEN $1::boolean IS NOT NULL THEN $1::boolean 
        ELSE NOT COALESCE(is_free_delivery, false) 
      END
      WHERE id = $2
      RETURNING id, name, is_free_delivery
    `;
    const { rows } = await pool.query(query, [explicitState !== undefined ? explicitState : null, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json({
      message: rows[0].is_free_delivery 
        ? `تم تفعيل التوصيل المجاني للمنتج (${rows[0].name})` 
        : `تم إلغاء التوصيل المجاني عن المنتج (${rows[0].name})`,
      product: rows[0]
    });
  } catch (err) {
    console.error('Error toggling product free delivery:', err);
    res.status(500).json({ error: 'خطأ في تحديث التوصيل المجاني للمنتج' });
  }
});

// PUT /api/admin/free-delivery/products/bulk
router.put('/api/admin/free-delivery/products/bulk', verifyAdmin, async (req, res) => {
  try {
    const { product_ids, is_free_delivery } = req.body;
    if (!Array.isArray(product_ids)) {
      return res.status(400).json({ error: 'قائمة المنتجات غير صالحة' });
    }
    const state = Boolean(is_free_delivery);
    await pool.query(
      'UPDATE public."Products" SET is_free_delivery = $1 WHERE id = ANY($2::int[])',
      [state, product_ids.map(id => parseInt(id, 10))]
    );
    res.json({
      message: `تم تحديث التوصيل المجاني لـ ${product_ids.length} منتج بنجاح`,
      updated_count: product_ids.length
    });
  } catch (err) {
    console.error('Error bulk updating free delivery:', err);
    res.status(500).json({ error: 'خطأ في التحديث الجماعي للتوصيل المجاني' });
  }
});

module.exports = {
  router,
  calculatePromoDiscount,
  checkFreeDeliveryEligibility
};
