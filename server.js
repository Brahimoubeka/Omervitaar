const express = require('express');
const path = require('path');
const app = express();
const db = require('./db');
require('dotenv').config();
const fs = require('fs');
const supabase = require('./supabase');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const BRANDING_PATH = path.join(__dirname, 'branding.json');

// JWT verification middleware for admin access
function verifyAdminAccess(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  
  if (!token) {
    return res.status(401).redirect('/login?error=unauthorized');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).redirect('/login?error=forbidden');
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).redirect('/login?error=invalid_token');
  }
}

// Set trust proxy so req.protocol and x-forwarded-proto work correctly on Render
app.set('trust proxy', true);
app.set('trust proxy', 1);

// --- Only force HTTPS, do NOT force www (let Render handle www redirects) ---
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  if (isLocal) return next();

  // Always force HTTPS
  const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps) {
    return res.redirect(301, 'https://' + host + req.originalUrl);
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

// --- Redirect .html URLs to clean URLs for SEO ---
app.use((req, res, next) => {
  const url = req.url.split('?')[0];
  
  // Define mapping of .html URLs to clean URLs
  const htmlToCleanUrls = {
    '/products.html': '/products',
    '/contact.html': '/contact',
    '/cart.html': '/cart',
    '/checkout.html': '/checkout',
    '/login.html': '/login',
    '/register.html': '/register',
    '/orders.html': '/orders',
    '/logout.html': '/logout',
    '/reset-password.html': '/reset-password',
    '/product-detail.html': '/product-detail.html', // Keep as is, this uses query params
    '/admin-products.html': '/admin-products',
    '/admin-orders.html': '/admin-orders',
    '/admin-messages.html': '/admin-messages',
    '/admin-analytics.html': '/admin-analytics'
  };
  
  // Check if URL matches any .html pattern and redirect to clean version
  if (htmlToCleanUrls[url]) {
    // For product-detail.html, keep the query parameters
    if (url === '/product-detail.html') {
      return next(); // Don't redirect, this page uses query params
    }
    
    // Preserve query parameters in redirect
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return res.redirect(301, htmlToCleanUrls[url] + queryString);
  }
  
  next();
});

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware (for JWT from cookies)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// --- Performance and Caching Middleware ---
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Compression hint
  res.setHeader('Vary', 'Accept-Encoding');
  
  // Performance hints
  res.setHeader('X-Powered-By', 'Omervita-Performance');
  
  next();
});

// --- Static file serving without caching ---
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
  maxAge: 0, // No caching
  etag: false,
  lastModified: false,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

app.use('/js', express.static(path.join(__dirname, 'public/js'), {
  maxAge: 0, // No caching
  etag: false,
  lastModified: false,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: 0, // No caching
  etag: false,
  lastModified: false,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Enable CORS for images
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: 0, // No caching
  etag: false,
  lastModified: false,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// --- Admin folder protection middleware (MUST be before main static files) ---
app.use('/admin', verifyAdminAccess);
app.use('/admin', express.static(path.join(__dirname, 'public/admin'), {
  maxAge: 0, // No caching
  etag: false,
  lastModified: false,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// --- HTML files - no caching (exclude admin folder) ---
app.use((req, res, next) => {
  // Skip admin folder requests - they're handled above
  if (req.path.startsWith('/admin')) {
    return next();
  }
  
  express.static(path.join(__dirname, 'public'), {
    maxAge: 0, // No caching
    etag: false,
    lastModified: false,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  })(req, res, next);
});

// --- Clean URL routing middleware (MUST be before static files) ---
app.use((req, res, next) => {
  const url = req.url.split('?')[0];
  
  // Helper function to extract ID from slug
  function extractIdFromSlug(slug) {
    const match = slug.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }
  
  // Handle product slug URLs: /products/product-name-123
  if (url.match(/^\/products\/[a-z0-9-]+$/i)) {
    const slug = url.replace('/products/', '');
    const productId = extractIdFromSlug(slug);
    if (productId) {
      req.url = `/product-detail.html?id=${productId}`;
    }
  }
  
  // Handle category slug URLs: /categories/category-name-123
  else if (url.match(/^\/categories\/[a-z0-9-]+$/i)) {
    const slug = url.replace('/categories/', '');
    const categoryId = extractIdFromSlug(slug);
    if (categoryId) {
      req.url = `/products.html?category=${categoryId}`;
    } else {
      console.log(`Warning: No valid category ID found in slug: ${slug}`);
      // Redirect to products page if category ID not found
      return res.redirect(301, '/products');
    }
  }
  
  // Handle malformed product category URLs (redirect to products)
  else if (url.match(/^\/products\/categories\//)) {
    console.log(`Malformed URL detected: ${url} - redirecting to /products`);
    return res.redirect(301, '/products');
  }
  
  // Handle other clean URLs
  else if (url === '/products') {
    req.url = '/products.html';
  }
  else if (url === '/contact') {
    req.url = '/contact.html';
  }
  else if (url === '/cart') {
    req.url = '/cart.html';
  }
  else if (url === '/checkout') {
    req.url = '/checkout.html';
  }
  else if (url === '/login') {
    req.url = '/login.html';
  }
  else if (url === '/register') {
    req.url = '/register.html';
  }
  else if (url === '/orders') {
    req.url = '/orders.html';
  }
  else if (url === '/admin-products') {
    // Verify admin access before redirecting to admin page
    return verifyAdminAccess(req, res, () => {
      req.url = '/admin/products.html';
      next();
    });
  }
  else if (url === '/admin-orders') {
    // Verify admin access before redirecting to admin page
    return verifyAdminAccess(req, res, () => {
      req.url = '/admin/orders.html';
      next();
    });
  }
  else if (url === '/admin-messages') {
    // Verify admin access before redirecting to admin page
    return verifyAdminAccess(req, res, () => {
      req.url = '/admin/messages.html';
      next();
    });
  }
  else if (url === '/admin-analytics') {
    // Verify admin access before redirecting to admin page
    return verifyAdminAccess(req, res, () => {
      req.url = '/admin/analytics.html';
      next();
    });
  }
  else if (url === '/logout') {
    req.url = '/logout.html';
  }
  else if (url === '/reset-password') {
    req.url = '/reset-password.html';
  }
  
  next();
});

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

// --- 404 Error handling for non-existent slugs ---
app.use((req, res, next) => {
  const url = req.url.split('?')[0];
  
  // Check if this is a slug-based URL that doesn't exist
  if (url.match(/^\/products\/[a-z0-9-]+$/i) || url.match(/^\/categories\/[a-z0-9-]+$/i)) {
    // Send 404 page
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
  
  next();
});

// Disable Express server signature for security and SEO
app.disable('x-powered-by');

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
