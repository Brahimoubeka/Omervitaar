const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const pool = require('../db');
const jwt = require('jsonwebtoken');

// 58 Algerian Wilayas defaults for when a new company is created
const DEFAULT_WILAYAS = [
  { code: "01", name: "Adrar", name_ar: "أدرار", home: 1200, desk: 800 },
  { code: "02", name: "Chlef", name_ar: "الشلف", home: 800, desk: 500 },
  { code: "03", name: "Laghouat", name_ar: "الأغواط", home: 1100, desk: 700 },
  { code: "04", name: "Oum El Bouaghi", name_ar: "أم البواقي", home: 800, desk: 500 },
  { code: "05", name: "Batna", name_ar: "باتنة", home: 800, desk: 500 },
  { code: "06", name: "Béjaïa", name_ar: "بجاية", home: 800, desk: 500 },
  { code: "07", name: "Biskra", name_ar: "بسكرة", home: 1100, desk: 700 },
  { code: "08", name: "Béchar", name_ar: "بشار", home: 1200, desk: 800 },
  { code: "09", name: "Blida", name_ar: "البليدة", home: 600, desk: 400 },
  { code: "10", name: "Bouira", name_ar: "البويرة", home: 800, desk: 500 },
  { code: "11", name: "Tamanrasset", name_ar: "تمنراست", home: 1950, desk: 1400 },
  { code: "12", name: "Tébessa", name_ar: "تبسة", home: 1100, desk: 700 },
  { code: "13", name: "Tlemcen", name_ar: "تلمسان", home: 800, desk: 500 },
  { code: "14", name: "Tiaret", name_ar: "تيارت", home: 800, desk: 500 },
  { code: "15", name: "Tizi Ouzou", name_ar: "تيزي وزو", home: 800, desk: 500 },
  { code: "16", name: "Algiers", name_ar: "الجزائر", home: 500, desk: 350 },
  { code: "17", name: "Djelfa", name_ar: "الجلفة", home: 1100, desk: 700 },
  { code: "18", name: "Jijel", name_ar: "جيجل", home: 800, desk: 500 },
  { code: "19", name: "Sétif", name_ar: "سطيف", home: 800, desk: 500 },
  { code: "20", name: "Saïda", name_ar: "سعيدة", home: 900, desk: 600 },
  { code: "21", name: "Skikda", name_ar: "سكيكدة", home: 900, desk: 600 },
  { code: "22", name: "Sidi Bel Abbès", name_ar: "سيدي بلعباس", home: 800, desk: 500 },
  { code: "23", name: "Annaba", name_ar: "عنابة", home: 800, desk: 500 },
  { code: "24", name: "Guelma", name_ar: "قالمة", home: 900, desk: 600 },
  { code: "25", name: "Constantine", name_ar: "قسنطينة", home: 800, desk: 500 },
  { code: "26", name: "Médéa", name_ar: "المدية", home: 800, desk: 500 },
  { code: "27", name: "Mostaganem", name_ar: "مستغانم", home: 800, desk: 500 },
  { code: "28", name: "M'Sila", name_ar: "المسيلة", home: 800, desk: 500 },
  { code: "29", name: "Mascara", name_ar: "معسكر", home: 800, desk: 500 },
  { code: "30", name: "Ouargla", name_ar: "ورقلة", home: 1100, desk: 700 },
  { code: "31", name: "Oran", name_ar: "وهران", home: 800, desk: 500 },
  { code: "32", name: "El Bayadh", name_ar: "البيض", home: 1200, desk: 800 },
  { code: "33", name: "Illizi", name_ar: "إليزي", home: 2000, desk: 1500 },
  { code: "34", name: "Bordj Bou Arréridj", name_ar: "برج بوعريريج", home: 800, desk: 500 },
  { code: "35", name: "Boumerdès", name_ar: "بومرداس", home: 600, desk: 400 },
  { code: "36", name: "El Tarf", name_ar: "الطارف", home: 900, desk: 600 },
  { code: "37", name: "Tindouf", name_ar: "تندوف", home: 1950, desk: 1400 },
  { code: "38", name: "Tissemsilt", name_ar: "تيسمسيلت", home: 900, desk: 600 },
  { code: "39", name: "El Oued", name_ar: "الوادي", home: 1100, desk: 700 },
  { code: "40", name: "Khenchela", name_ar: "خنشلة", home: 900, desk: 600 },
  { code: "41", name: "Souk Ahras", name_ar: "سوق أهراس", home: 900, desk: 600 },
  { code: "42", name: "Tipaza", name_ar: "تيبازة", home: 600, desk: 400 },
  { code: "43", name: "Mila", name_ar: "ميلة", home: 800, desk: 500 },
  { code: "44", name: "Aïn Defla", name_ar: "عين الدفلى", home: 800, desk: 500 },
  { code: "45", name: "Naâma", name_ar: "النعامة", home: 1200, desk: 800 },
  { code: "46", name: "Aïn Témouchent", name_ar: "عين تموشنت", home: 800, desk: 500 },
  { code: "47", name: "Ghardaïa", name_ar: "غرداية", home: 1100, desk: 700 },
  { code: "48", name: "Relizane", name_ar: "غليزان", home: 800, desk: 500 },
  { code: "49", name: "Timimoun", name_ar: "تيميمون", home: 1200, desk: 800 },
  { code: "50", name: "Bordj Badji Mokhtar", name_ar: "برج باجي مختار", home: 2000, desk: 1500 },
  { code: "51", name: "Ouled Djellal", name_ar: "أولاد جلال", home: 1100, desk: 700 },
  { code: "52", name: "Béni Abbès", name_ar: "بني عباس", home: 1200, desk: 800 },
  { code: "53", name: "In Salah", name_ar: "عين صالح", home: 1950, desk: 1400 },
  { code: "54", name: "In Guezzam", name_ar: "عين قزام", home: 1950, desk: 1400 },
  { code: "55", name: "Touggourt", name_ar: "تقرت", home: 1100, desk: 700 },
  { code: "56", name: "Djanet", name_ar: "جانت", home: 1950, desk: 1400 },
  { code: "57", name: "El M'Ghair", name_ar: "المغير", home: 1100, desk: 700 },
  { code: "58", name: "El Menia", name_ar: "المنيعة", home: 1100, desk: 700 }
];

// Helper: Verify Admin Token
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'رمز غير صالح', details: e.message });
  }
}

// --------------------------------------------------------------------------
// 1. PUBLIC: GET /api/delivery-companies
// Returns all active delivery companies for checkout dropdown
// --------------------------------------------------------------------------
router.get('/delivery-companies', async (req, res) => {
  try {
    const { rows: companies } = await pool.query(
      'SELECT id, name, code, is_default FROM public."DeliveryCompanies" WHERE is_active = true ORDER BY is_default DESC, id ASC'
    );
    res.json(companies);
  } catch (err) {
    console.error('Error fetching public delivery companies:', err);
    res.status(500).json({ error: 'خطأ في جلب شركات التوصيل' });
  }
});

// --------------------------------------------------------------------------
// 2. PUBLIC: GET /api/delivery-costs
// Returns rates for active or specified delivery company (with backward-compatible flat map)
// --------------------------------------------------------------------------
router.get('/delivery-costs', async (req, res) => {
  try {
    let { company_id } = req.query;
    let company;
    if (company_id) {
      const { rows } = await pool.query(
        'SELECT * FROM public."DeliveryCompanies" WHERE id = $1 AND is_active = true',
        [parseInt(company_id, 10)]
      );
      company = rows[0];
    }

    if (!company) {
      const { rows } = await pool.query(
        'SELECT * FROM public."DeliveryCompanies" WHERE is_active = true ORDER BY is_default DESC, id ASC LIMIT 1'
      );
      company = rows[0];
    }

    if (!company) {
      // Fallback response if no company in DB
      const fallback = {};
      const fallbackMap = {};
      DEFAULT_WILAYAS.forEach(w => { 
        fallback[w.name] = w.home;
        fallbackMap[w.name] = {
          city_name: w.name,
          city_code: w.code,
          home: w.home,
          home_price: w.home,
          desk: w.desk,
          desk_price: w.desk,
          is_active: true
        };
      });
      return res.json({
        company: null,
        rates: DEFAULT_WILAYAS.map(w => ({
          city_name: w.name,
          city_code: w.code,
          home: w.home,
          home_price: w.home,
          desk: w.desk,
          desk_price: w.desk,
          is_active: true
        })),
        ratesMap: fallbackMap,
        ...fallback
      });
    }

    const { rows: rates } = await pool.query(
      'SELECT * FROM public."DeliveryRates" WHERE company_id = $1 ORDER BY city_code ASC, city_name ASC',
      [company.id]
    );

    // Build backward-compatible flat map of city -> home_price and ratesMap
    const flatMap = {};
    const ratesMap = {};
    const formattedRates = rates.map(r => {
      const homeVal = parseFloat(r.home_price) || 0;
      const deskVal = parseFloat(r.desk_price) || 0;
      flatMap[r.city_name] = homeVal;
      const item = {
        id: r.id,
        city_name: r.city_name,
        city_code: r.city_code,
        home: homeVal,
        home_price: homeVal,
        desk: deskVal,
        desk_price: deskVal,
        is_active: r.is_active
      };
      ratesMap[r.city_name] = item;
      return item;
    });

    res.json({
      company: {
        id: company.id,
        name: company.name,
        code: company.code,
        is_active: company.is_active,
        is_default: company.is_default
      },
      rates: formattedRates,
      ratesMap,
      ...flatMap
    });
  } catch (err) {
    console.error('Error fetching delivery costs:', err);
    // Safe static fallback on any error
    const fallback = {};
    DEFAULT_WILAYAS.forEach(w => { fallback[w.name] = w.home; });
    res.json({ company: null, rates: [], ...fallback });
  }
});

// --------------------------------------------------------------------------
// 2. ADMIN: GET /api/admin/delivery-companies
// --------------------------------------------------------------------------
router.get('/admin/delivery-companies', verifyAdminToken, async (req, res) => {
  try {
    const { rows: companies } = await pool.query(`
      SELECT c.*, 
             COUNT(r.id)::int as cities_count,
             COUNT(r.id)::int as rates_count
      FROM public."DeliveryCompanies" c
      LEFT JOIN public."DeliveryRates" r ON r.company_id = c.id
      GROUP BY c.id
      ORDER BY c.is_default DESC, c.id ASC
    `);
    res.json({ success: true, companies });
  } catch (err) {
    console.error('Error fetching admin delivery companies:', err);
    res.status(500).json({ error: 'خطأ في جلب شركات التوصيل', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. ADMIN: POST /api/admin/delivery-companies (Create company + default 58 wilayas)
// --------------------------------------------------------------------------
router.post('/admin/delivery-companies', verifyAdminToken, async (req, res) => {
  const { name, code, is_default, is_active } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'اسم شركة التوصيل مطلوب.' });
  }

  const cleanName = name.trim();
  const cleanCode = (code || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();

  try {
    if (is_default) {
      await pool.query('UPDATE public."DeliveryCompanies" SET is_default = false');
    }

    const { rows: newComp } = await pool.query(
      `INSERT INTO public."DeliveryCompanies" (name, code, is_active, is_default)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [cleanName, cleanCode, is_active !== false, is_default === true]
    );

    const company = newComp[0];

    // Seed all 58 wilayas as default for this new company
    for (const w of DEFAULT_WILAYAS) {
      await pool.query(
        `INSERT INTO public."DeliveryRates" (company_id, city_name, city_code, home_price, desk_price, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (company_id, city_name) DO NOTHING`,
        [company.id, w.name, w.code, w.home, w.desk]
      );
    }

    res.json({ message: 'تمت إضافة شركة التوصيل وتعبئة الولايات الـ 58 بنجاح!', company });
  } catch (err) {
    console.error('Error creating delivery company:', err);
    res.status(500).json({ error: 'خطأ في إنشاء شركة التوصيل', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. ADMIN: PUT /api/admin/delivery-companies/:id (Update company info / set default)
// --------------------------------------------------------------------------
router.put('/admin/delivery-companies/:id', verifyAdminToken, async (req, res) => {
  const companyId = parseInt(req.params.id, 10);
  const { name, code, is_active, is_default } = req.body;

  try {
    if (is_default) {
      await pool.query('UPDATE public."DeliveryCompanies" SET is_default = false WHERE id != $1', [companyId]);
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name.trim()); }
    if (code !== undefined) { fields.push(`code = $${idx++}`); values.push(code.trim()); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(Boolean(is_active)); }
    if (is_default !== undefined) { fields.push(`is_default = $${idx++}`); values.push(Boolean(is_default)); }

    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث.' });

    fields.push(`updated_at = NOW()`);
    values.push(companyId);

    const { rows: updated } = await pool.query(
      `UPDATE public."DeliveryCompanies" SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (updated.length === 0) return res.status(404).json({ error: 'الشركة غير موجودة.' });
    res.json({ message: 'تم تحديث بيانات الشركة بنجاح!', company: updated[0] });
  } catch (err) {
    console.error('Error updating delivery company:', err);
    res.status(500).json({ error: 'خطأ في تحديث الشركة', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. ADMIN: DELETE /api/admin/delivery-companies/:id
// --------------------------------------------------------------------------
router.delete('/admin/delivery-companies/:id', verifyAdminToken, async (req, res) => {
  const companyId = parseInt(req.params.id, 10);
  try {
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int as count FROM public."DeliveryCompanies"');
    if (countRows[0].count <= 1) {
      return res.status(400).json({ error: 'يجب الإبقاء على شركة توصيل واحدة على الأقل.' });
    }

    await pool.query('DELETE FROM public."DeliveryCompanies" WHERE id = $1', [companyId]);
    res.json({ message: 'تم حذف شركة التوصيل بنجاح!' });
  } catch (err) {
    console.error('Error deleting delivery company:', err);
    res.status(500).json({ error: 'خطأ في حذف الشركة', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. ADMIN: GET /api/admin/delivery-rates/:companyId
// --------------------------------------------------------------------------
router.get('/admin/delivery-rates/:companyId', verifyAdminToken, async (req, res) => {
  const companyId = parseInt(req.params.companyId, 10);
  try {
    const { rows: compRows } = await pool.query(
      'SELECT * FROM public."DeliveryCompanies" WHERE id = $1',
      [companyId]
    );
    const company = compRows[0] || null;

    const { rows: rates } = await pool.query(
      'SELECT * FROM public."DeliveryRates" WHERE company_id = $1 ORDER BY city_code ASC, city_name ASC',
      [companyId]
    );
    res.json({ success: true, company, rates });
  } catch (err) {
    console.error('Error fetching delivery rates:', err);
    res.status(500).json({ error: 'خطأ في جلب الأسعار', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. ADMIN: PUT /api/admin/delivery-rates/:companyId (Batch update rates)
// --------------------------------------------------------------------------
router.put('/admin/delivery-rates/:companyId', verifyAdminToken, async (req, res) => {
  const companyId = parseInt(req.params.companyId, 10);
  const { rates } = req.body;

  if (!Array.isArray(rates)) {
    return res.status(400).json({ error: 'البيانات غير صالحة، مطلوب مصفوفة أسعار.' });
  }

  try {
    for (const r of rates) {
      if (!r.city_name) continue;
      const homePrice = parseFloat(r.home_price) || 0;
      const deskPrice = parseFloat(r.desk_price) || 0;
      const isActive = r.is_active !== false;
      const cityCode = r.city_code || '';

      await pool.query(`
        INSERT INTO public."DeliveryRates" (company_id, city_name, city_code, home_price, desk_price, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (company_id, city_name) 
        DO UPDATE SET 
          home_price = EXCLUDED.home_price,
          desk_price = EXCLUDED.desk_price,
          is_active = EXCLUDED.is_active,
          city_code = COALESCE(NULLIF(EXCLUDED.city_code, ''), public."DeliveryRates".city_code),
          updated_at = NOW();
      `, [companyId, r.city_name, cityCode, homePrice, deskPrice, isActive]);
    }

    res.json({ message: 'تم حفظ أسعار التوصيل بنجاح!' });
  } catch (err) {
    console.error('Error saving delivery rates:', err);
    res.status(500).json({ error: 'خطأ في حفظ أسعار التوصيل', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. ADMIN: POST /api/admin/delivery-rates/:companyId/city (Add single city)
// --------------------------------------------------------------------------
router.post('/admin/delivery-rates/:companyId/city', verifyAdminToken, async (req, res) => {
  const companyId = parseInt(req.params.companyId, 10);
  const { city_name, city_code, home_price, desk_price } = req.body;

  if (!city_name || !city_name.trim()) {
    return res.status(400).json({ error: 'اسم المدينة مطلوب.' });
  }

  const cleanName = city_name.trim();
  const cleanCode = (city_code || '').trim();
  const homeVal = parseFloat(home_price) >= 0 ? parseFloat(home_price) : 800;
  const deskVal = parseFloat(desk_price) >= 0 ? parseFloat(desk_price) : 500;

  try {
    const { rows: inserted } = await pool.query(`
      INSERT INTO public."DeliveryRates" (company_id, city_name, city_code, home_price, desk_price, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (company_id, city_name) 
      DO UPDATE SET home_price = $4, desk_price = $5, is_active = true, updated_at = NOW()
      RETURNING *;
    `, [companyId, cleanName, cleanCode, homeVal, deskVal]);

    res.json({ message: 'تمت إضافة المدينة بنجاح!', rate: inserted[0] });
  } catch (err) {
    console.error('Error adding city:', err);
    res.status(500).json({ error: 'خطأ في إضافة المدينة', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 9. ADMIN: DELETE /api/admin/delivery-rates/:rateId (Remove single city rate)
// --------------------------------------------------------------------------
router.delete('/admin/delivery-rates/:rateId', verifyAdminToken, async (req, res) => {
  const rateId = parseInt(req.params.rateId, 10);
  try {
    await pool.query('DELETE FROM public."DeliveryRates" WHERE id = $1', [rateId]);
    res.json({ message: 'تم حذف المدينة بنجاح!' });
  } catch (err) {
    console.error('Error deleting city rate:', err);
    res.status(500).json({ error: 'خطأ في حذف المدينة', details: err.message });
  }
});

router.DEFAULT_WILAYAS = DEFAULT_WILAYAS;
module.exports = router;
