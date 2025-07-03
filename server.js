const express = require('express');
const path = require('path');
const app = express();
const db = require('./db');
require('dotenv').config();
const fs = require('fs');
const supabase = require('./supabase');

const PORT = process.env.PORT || 3000;
const BRANDING_PATH = path.join(__dirname, 'branding.json');

// --- Force HTTPS and www redirects (except on localhost) ---
app.use((req, res, next) => {
  // Only run in production (not localhost)
  const host = req.headers.host || '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  if (isLocal) return next();

  // Force HTTPS
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + host + req.originalUrl);
  }

  // Force www
  if (!host.startsWith('www.')) {
    return res.redirect(301, 'https://www.' + host.replace(/^https?:\/\//, '').replace(/^www\./, '') + req.originalUrl);
  }

  next();
});

// --- Redirect /index.html and /index to root (/) for SEO duplicate fix ---
app.use((req, res, next) => {
  const url = req.url.split('?')[0];
  if (url === '/index.html' || url === '/index') {
    return res.redirect(301, '/');
  }
  next();
});

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const productRoutes = require('./routes/products');
app.use('/api', productRoutes);

const ordersRoutes = require('./routes/orders');
app.use('/api', ordersRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api', adminRoutes);

const messagesRoutes = require('./routes/messages');
app.use('/api', messagesRoutes);

const reviewsRoutes = require('./routes/reviews');
app.use('/api', reviewsRoutes);

const analyticsRoutes = require('./routes/analytics');
app.use('/api', analyticsRoutes);

const chatbotRoutes = require('./routes/chatbot');
app.use('/api', chatbotRoutes);

// --- Supabase Branding Table Helpers ---

// Get branding info from Supabase table (single row, id=1)
async function getBrandingFromSupabase() {
  const { data, error } = await supabase
    .from('branding')
    .select('*')
    .eq('id', 1)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116: No rows found
  return data || {};
}

// Update branding info in Supabase table (single row, id=1)
async function updateBrandingInSupabase(fields) {
  // Upsert row with id=1
  const { data, error } = await supabase
    .from('branding')
    .upsert([{ id: 1, ...fields }], { onConflict: ['id'] });
  if (error) throw error;
  return data && data[0] ? data[0] : fields;
}

// --- Helper: Upload buffer to Supabase Storage and return public URL
async function uploadToSupabaseBranding(fileBuffer, fileName, mimetype) {
  const { data, error } = await supabase.storage.from('branding').upload(fileName, fileBuffer, {
    contentType: mimetype,
    upsert: true
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('branding').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// Helper: Remove file from Supabase Storage by public URL
async function removeFromSupabaseBranding(publicUrl) {
  if (!publicUrl) return;
  try {
    // Extract the path after the bucket name
    const url = new URL(publicUrl);
    const parts = url.pathname.split('/');
    // e.g. /storage/v1/object/public/branding/logo.png
    const brandingIdx = parts.indexOf('branding');
    if (brandingIdx !== -1 && parts.length > brandingIdx + 1) {
      const filePath = parts.slice(brandingIdx + 1).join('/');
      await supabase.storage.from('branding').remove([filePath]);
    }
  } catch (e) { /* ignore */ }
}

// --- API: /api/branding (GET) ---
app.get('/api/branding', async (req, res) => {
  try {
    const branding = await getBrandingFromSupabase();
    res.json(branding);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في تحميل بيانات العلامة التجارية', details: e.message });
  }
});

// --- API: /api/delivery-costs (GET) ---
app.get('/api/delivery-costs', async (req, res) => {
  // You can load this from a DB or file if you want, here is a static fallback
  res.json({
    "Adrar": 400, "Chlef": 350, "Laghouat": 420, "Oum El Bouaghi": 390, "Batna": 410, "Béjaïa": 370, "Biskra": 430, "Béchar": 450, "Blida": 320, "Bouira": 360, "Tamanrasset": 600, "Tébessa": 440, "Tlemcen": 380, "Tiaret": 370, "Tizi Ouzou": 340, "Algiers": 300, "Djelfa": 410, "Jijel": 370, "Sétif": 360, "Saïda": 390, "Skikda": 380, "Sidi Bel Abbès": 370, "Annaba": 400, "Guelma": 390, "Constantine": 350, "Médéa": 330, "Mostaganem": 340, "M'Sila": 400, "Mascara": 370, "Ouargla": 500, "Oran": 350, "El Bayadh": 470, "Illizi": 650, "Bordj Bou Arréridj": 360, "Boumerdès": 320, "El Tarf": 420, "Tindouf": 700, "Tissemsilt": 390, "El Oued": 520, "Khenchela": 430, "Souk Ahras": 410, "Tipaza": 310, "Mila": 380, "Aïn Defla": 340, "Naâma": 480, "Aïn Témouchent": 370, "Ghardaïa": 530, "Relizane": 350, "Timimoun": 600, "Bordj Badji Mokhtar": 750, "Ouled Djellal": 480, "Béni Abbès": 650, "In Salah": 700, "In Guezzam": 800, "Touggourt": 550, "Djanet": 750, "El M'Ghair": 540, "El Menia": 600
  });
});

// --- API: /api/admin/branding (POST) ---
app.post('/api/admin/branding', async (req, res) => {
  try {
    const fields = ['facebook', 'instagram', 'tiktok', 'phone', 'email', 'logo', 'cover1', 'cover2', 'cover3'];
    const updateFields = {};
    for (const key of fields) {
      if (req.body[key] !== undefined) updateFields[key] = req.body[key];
    }
    const branding = await updateBrandingInSupabase(updateFields);
    res.json(branding);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في حفظ بيانات العلامة التجارية', details: e.message });
  }
});

// --- API: /api/admin/logo (POST) ---
app.post('/api/admin/logo', async (req, res) => {
  try {
    const formidable = require('formidable');
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      let file = files.logo;
      if (Array.isArray(file)) file = file[0];
      if (err || !file || !file.filepath) return res.status(400).json({ error: 'لم يتم تحميل الشعار.' });
      // Get current branding from Supabase
      const branding = await getBrandingFromSupabase();
      // Remove old logo from Supabase if exists
      if (branding.logo) await removeFromSupabaseBranding(branding.logo);
      const fsPromises = require('fs').promises;
      const fileBuffer = await fsPromises.readFile(file.filepath);
      const ext = (file.originalFilename || 'logo.png').split('.').pop();
      const fileName = `logo.${ext}`;
      const publicUrl = await uploadToSupabaseBranding(fileBuffer, fileName, file.mimetype || 'image/png');
      // Update branding in Supabase
      await updateBrandingInSupabase({ logo: publicUrl });
      res.json({ message: 'تم تحديث الشعار بنجاح!', logo: publicUrl });
    });
  } catch (e) {
    res.status(500).json({ error: 'خطأ أثناء تحديث الشعار', details: e.message });
  }
});

// --- API: /api/admin/slide (POST) ---
app.post('/api/admin/slide', async (req, res) => {
  try {
    const formidable = require('formidable');
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      let file = files.slide;
      if (Array.isArray(file)) file = file[0];
      const index = fields.index;
      if (err || !file || !file.filepath || !index) return res.status(400).json({ error: 'لم يتم تحميل صورة السلايد.' });
      // Get current branding from Supabase
      const branding = await getBrandingFromSupabase();
      // Remove old slide from Supabase if exists
      if (branding[`cover${index}`]) await removeFromSupabaseBranding(branding[`cover${index}`]);
      const fsPromises = require('fs').promises;
      const fileBuffer = await fsPromises.readFile(file.filepath);
      const ext = (file.originalFilename || `cover${index}.png`).split('.').pop();
      const fileName = `cover${index}.${ext}`;
      const publicUrl = await uploadToSupabaseBranding(fileBuffer, fileName, file.mimetype || 'image/png');
      // Update branding in Supabase
      await updateBrandingInSupabase({ [`cover${index}`]: publicUrl });
      res.json({ message: `تم تحديث صورة السلايد رقم ${index} بنجاح!`, [`cover${index}`]: publicUrl });
    });
  } catch (e) {
    res.status(500).json({ error: 'خطأ أثناء تحديث صورة السلايد', details: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
