const express = require('express');
const compression = require('compression');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const db = require('./db');
require('dotenv').config();
const fs = require('fs');
const supabase = require('./supabase');
const jwt = require('jsonwebtoken');
const { router: trackingRoutes, getCompiledTrackingScripts } = require('./routes/tracking');

// Helper to inject custom tracking scripts before </head> and </body>
async function injectTrackingIntoHtml(html) {
  try {
    const { headScripts, bodyScripts } = await getCompiledTrackingScripts();
    let result = html;
    if (headScripts && headScripts.trim()) {
      result = result.replace('</head>', `\n<!-- [Custom Tracking Scripts Head] -->\n${headScripts}\n</head>`);
    }
    if (bodyScripts && bodyScripts.trim()) {
      result = result.replace('</body>', `\n<!-- [Custom Tracking Scripts Body] -->\n${bodyScripts}\n</body>`);
    }
    return result;
  } catch (err) {
    console.error('Error injecting tracking scripts:', err);
    return html;
  }
}

// Prevent unhandled promise rejections from crashing the server
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection] at:', promise, 'reason:', reason);
});

// Enable Gzip/Brotli compression for all compressible responses
app.use(compression());

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lightweight health check route for keep-alive monitoring (prevents Render free-tier cold sleep)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
const BRANDING_PATH = path.join(__dirname, 'branding.json');

// CRITICAL: Product detail route MUST be first before any other middleware
// This ensures social media crawlers get the correct meta tags
app.get('/product-detail.html', async (req, res) => {
  const productId = req.query.id;
  
  // Check if this is a request from a social media crawler
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|skypeuripreview|slackbot|discordbot|googlebot|bingbot|bot|crawler|spider|scraper/i.test(userAgent);
  
  if (productId && isCrawler) {
    try {
      const html = await renderProductDetailHTML(parseInt(productId, 10));
      return res.send(html);
    } catch (error) {
      console.error('Error serving SSR product detail page:', error);
      return res.sendFile(path.join(__dirname, 'public', 'product-detail.html'));
    }
  } else {
    // Regular users get the page with tracking injected
    try {
      const htmlPath = path.join(__dirname, 'public', 'product-detail.html');
      const content = await fs.promises.readFile(htmlPath, 'utf-8');
      const injected = await injectTrackingIntoHtml(content);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.send(injected);
    } catch (err) {
      return res.sendFile(path.join(__dirname, 'public', 'product-detail.html'));
    }
  }
});

// Clean URL route for products (/products/:id) - Social media friendly
app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  
  // Helper function to extract ID from slug (handles both "slug-text-123" and "123" formats)
  function extractIdFromSlug(slug) {
    if (!slug) return null;
    
    // First check if it's just a numeric ID
    if (/^\d+$/.test(slug)) {
      return parseInt(slug, 10);
    }
    
    // Then check for slug format with ID at the end
    const match = slug.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }
  
  // Extract product ID from either numeric format or slug format
  const extractedProductId = extractIdFromSlug(productId);
  
  if (!extractedProductId) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
  
  // Check if this is a request from a social media crawler
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|skypeuripreview|slackbot|discordbot|googlebot|bingbot|bot|crawler|spider|scraper/i.test(userAgent);
  
  if (isCrawler) {
    try {
      const html = await renderProductDetailHTML(extractedProductId);
      return res.send(html);
    } catch (error) {
      console.error('Error serving SSR product detail page for clean URL:', error);
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
  } else {
    // For regular users, serve the SPA version with the correct product ID in the URL
    req.url = `/product-detail.html?id=${extractedProductId}`;
    return res.sendFile(path.join(__dirname, 'public', 'product-detail.html'));
  }
});

// Clean URLs for Landing Pages and Funnel Sections
app.get(['/solutions/:slug', '/landing/:slug', '/landing.html'], async (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'landing.html');
    const content = await fs.promises.readFile(htmlPath, 'utf-8');
    const injected = await injectTrackingIntoHtml(content);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.send(injected);
  } catch (err) {
    return res.sendFile(path.join(__dirname, 'public', 'landing.html'));
  }
});

// Helper functions for product meta tags (must be defined before routes)

// Helper functions for product meta tags (must be defined before routes)
function escapeHtmlAttribute(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateProductMetaTags(productId) {
  try {
    const supabase = require('./supabase');
    const SlugUtil = require('./utils/slug-util');
    
    // Fetch product data
    const { data: prodRows, error: prodError } = await supabase
      .from('Products')
      .select('*')
      .eq('id', productId);
    
    if (prodError || !prodRows || prodRows.length === 0) {
      return null;
    }
    
    const product = prodRows[0];
    
    // Fetch product images
    const { data: imgRows } = await supabase
      .from('ProductImages')
      .select('imagePath, id')
      .eq('product_id', productId)
      .order('id', { ascending: true });
    
    // Fetch product categories
    const { data: catRows } = await supabase
      .from('ProductCategories')
      .select('category_id, Categories(id, name)')
      .eq('product_id', productId);
    
    // Process data
    const images = (imgRows || []).map(i => i.imagePath);
    const categories = (catRows || []).filter(r => r.Categories).map(r => r.Categories);
    
    const productImage = images.length > 0 ? images[0] : product.imagePath || 'images/logo.png';
    const fullImageUrl = productImage.startsWith('http') ? productImage : `https://omervita.com/${productImage.replace(/^\/+/, '')}`;
    
    // Ensure name/description are strings
    product.name = Array.isArray(product.name) ? (product.name[0] || '') : (product.name || '');
    product.description = Array.isArray(product.description) ? (product.description[0] || '') : (product.description || '');
    
    const title = `${product.name} - ${product.price ? product.price + ' دج' : 'السعر غير متوفر'} | Omervita`;
    const description = product.description ? 
      `${product.description.substring(0, 155)}...` : 
      `اشتري ${product.name} بأفضل سعر من Omervita. منتجات طبيعية عالية الجودة مع توصيل سريع.`;
    const url = `https://omervita.com/products/${SlugUtil.generateProductSlug(product)}`;
    const availability = product.stock > 0 ? 'متوفر' : 'غير متوفر';
    
    return {
      title,
      description,
      url,
      image: fullImageUrl,
      price: product.price || '0',
      availability,
      product,
      categories
    };
    
  } catch (error) {
    console.error('Error generating product meta tags:', error);
    return null;
  }
}

// Helper function to render product detail HTML with meta tags
async function renderProductDetailHTML(productId) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Read the original HTML file
    const htmlPath = path.join(__dirname, 'public', 'product-detail.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    
    // Get product meta data
    const metaData = await generateProductMetaTags(productId);
    
    if (!metaData) {
      return html; // Return original HTML if no product found
    }
    
    // Replace the default meta tags with product-specific ones using exact string matching
    const originalDescriptionTag = '<meta name="description" content="اكتشف تفاصيل المنتج من Omervita. معلومات شاملة عن المكونات والفوائد والاستخدام لمنتجات العناية الطبيعية.">';
    
    // Replace title
    const originalTitle = '<title>Omervita - تفاصيل المنتج</title>';
    const newTitle = `<title>${escapeHtmlAttribute(metaData.title)}</title>`;
    if (html.includes(originalTitle)) {
      html = html.replace(originalTitle, newTitle);
    }
    
    // Replace description
    const newDescription = `<meta name="description" content="${escapeHtmlAttribute(metaData.description)}">`;
    if (html.includes(originalDescriptionTag)) {
      html = html.replace(originalDescriptionTag, newDescription);
    }
    
    // Replace Open Graph title
    const originalOgTitle = '<meta property="og:title" content="Omervita - منتجات طبيعية عالية الجودة">';
    const newOgTitle = `<meta property="og:title" content="${escapeHtmlAttribute(metaData.title)}">`;
    if (html.includes(originalOgTitle)) {
      html = html.replace(originalOgTitle, newOgTitle);
    }
    
    // Replace Open Graph description
    const originalOgDescription = '<meta property="og:description" content="اكتشف منتجات Omervita الطبيعية عالية الجودة للعناية بالبشرة والشعر والجسم.">';
    const newOgDescription = `<meta property="og:description" content="${escapeHtmlAttribute(metaData.description)}">`;
    if (html.includes(originalOgDescription)) {
      html = html.replace(originalOgDescription, newOgDescription);
    }
    
    // Replace Open Graph image
    const originalOgImage = '<meta property="og:image" content="https://omervita.com/images/logo.png">';
    const newOgImage = `<meta property="og:image" content="${escapeHtmlAttribute(metaData.image)}">`;
    if (html.includes(originalOgImage)) {
      html = html.replace(originalOgImage, newOgImage);
    }
    
    // Replace Open Graph URL
    const originalOgUrl = '<meta property="og:url" content="https://omervita.com/">';
    const newOgUrl = `<meta property="og:url" content="${escapeHtmlAttribute(metaData.url)}">`;
    if (html.includes(originalOgUrl)) {
      html = html.replace(originalOgUrl, newOgUrl);
    }
    
    // Replace Twitter title
    const originalTwitterTitle = '<meta name="twitter:title" content="Omervita - منتجات طبيعية عالية الجودة">';
    const newTwitterTitle = `<meta name="twitter:title" content="${escapeHtmlAttribute(metaData.title)}">`;
    if (html.includes(originalTwitterTitle)) {
      html = html.replace(originalTwitterTitle, newTwitterTitle);
    }
    
    // Replace Twitter description
    const originalTwitterDescription = '<meta name="twitter:description" content="اكتشف منتجات Omervita الطبيعية عالية الجودة للعناية بالبشرة والشعر والجسم.">';
    const newTwitterDescription = `<meta name="twitter:description" content="${escapeHtmlAttribute(metaData.description)}">`;
    if (html.includes(originalTwitterDescription)) {
      html = html.replace(originalTwitterDescription, newTwitterDescription);
    }
    
    // Replace Twitter image
    const originalTwitterImage = '<meta name="twitter:image" content="https://omervita.com/images/logo.png">';
    const newTwitterImage = `<meta name="twitter:image" content="${escapeHtmlAttribute(metaData.image)}">`;
    if (html.includes(originalTwitterImage)) {
      html = html.replace(originalTwitterImage, newTwitterImage);
    }
    
    // Inject tracking scripts into rendered SSR HTML
    html = await injectTrackingIntoHtml(html);
    return html;
    
  } catch (error) {
    console.error('renderProductDetailHTML error:', error);
    // Return original HTML file if error occurs
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, 'public', 'product-detail.html');
    return fs.readFileSync(htmlPath, 'utf-8');
  }
}

// CRITICAL: Product detail route MUST be first before any other middleware
// This ensures social media crawlers get the correct meta tags

// JWT verification middleware for admin access
function verifyAdminAccess(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = req.cookies?.token || req.cookies?.jwt || (authHeader && authHeader.split(' ')[1]);
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)(?:token|jwt)=([^;]*)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  
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

// --- Static file serving with production caching (CDN & Browser friendly) ---
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
}));

app.use('/js', express.static(path.join(__dirname, 'public/js'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
}));

app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '30d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    // Enable CORS for images
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: '30d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filepath) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
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

// --- HTML files - no caching (exclude admin folder and product-detail.html) ---
// This middleware is disabled to prevent conflicts with the product-detail.html route
// Static HTML files are served by the main static middleware below

// --- Clean URL routing middleware (MUST be before static files) ---
app.use(async (req, res, next) => {
  const url = req.url.split('?')[0];
  
  // Helper function to extract ID from slug (handles both "slug-text-123" and "123" formats)
  function extractIdFromSlug(slug) {
    if (!slug) return null;
    
    // First check if it's just a numeric ID
    if (/^\d+$/.test(slug)) {
      return parseInt(slug, 10);
    }
    
    // Then check for slug format with ID at the end
    const match = slug.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }
  
  // Handle product slug URLs: /products/product-name-123 or /products/123
  // NOTE: This is now handled by the explicit /products/:id route above, so we skip it here
  if (url.match(/^\/products\/[^\/\?]+$/i)) {
    // Skip - handled by explicit route
    return next();
  }
  
  // Handle category slug URLs: /categories/category-name-123 or /categories/123
  else if (url.match(/^\/categories\/[\w\d-]+$/i)) {
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
  else if (url === '/admin-settings') {
    // Verify admin access before redirecting to site settings page
    return verifyAdminAccess(req, res, () => {
      req.url = '/admin/site-settings.html';
      next();
    });
  }
  else if (url === '/admin-funnels' || url === '/admin/funnels' || url === '/admin/funnels.html') {
    // Verify admin access before redirecting to funnels & landing pages builder
    return verifyAdminAccess(req, res, () => {
      req.url = '/admin/funnels.html';
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

// Middleware to serve HTML pages with dynamic tracking scripts injected
app.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const urlPath = req.path;

  // Don't intercept admin pages or API routes
  if (urlPath.startsWith('/admin') || urlPath.startsWith('/api')) {
    return next();
  }

  let targetFile = null;
  if (urlPath === '/' || urlPath === '/index.html') {
    targetFile = 'index.html';
  } else if (urlPath.endsWith('.html')) {
    targetFile = urlPath.replace(/^\//, '');
  }

  if (targetFile) {
    try {
      const filePath = path.join(__dirname, 'public', targetFile);
      const content = await fs.promises.readFile(filePath, 'utf8');
      const injected = await injectTrackingIntoHtml(content);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.send(injected);
    } catch (err) {
      return next();
    }
  }

  next();
});

// Serve static files from the "public" folder (exclude product-detail.html)
app.use((req, res, next) => {
  // Skip product-detail.html - it has its own route handler  
  if (req.path === '/product-detail.html') {
    return next();
  }
  
  // Use a more specific static middleware that doesn't interfere with routes
  const staticMiddleware = express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        // HTML pages use must-revalidate so updates reflect immediately while leveraging 304 ETags
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  });
  
  staticMiddleware(req, res, next);
});

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const productRoutes = require('./routes/products');
app.use('/api', productRoutes);

const ordersRoutes = require('./routes/orders');
app.use('/api', ordersRoutes);

const guestOrderRoutes = require('./routes/guest-orders');
app.use('/api', guestOrderRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api', adminRoutes);

const messagesRoutes = require('./routes/messages');
app.use('/api', messagesRoutes);

const reviewsRoutes = require('./routes/reviews');
app.use('/api', reviewsRoutes);

const analyticsRoutes = require('./routes/analytics');
app.use('/api', analyticsRoutes);

const deliveryRoutes = require('./routes/delivery');
app.use('/api', deliveryRoutes);

app.use('/api', trackingRoutes);

const { router: promosRoutes } = require('./routes/promos');
app.use('/api', promosRoutes);

const { router: funnelsRoutes } = require('./routes/funnels');
app.use('/api', funnelsRoutes);



// --- site_settings Table Helpers with In-Memory Caching (Protects Supabase Free Tier) ---
let cachedSiteSettings = null;
let cachedSiteSettingsTime = 0;
const SITE_SETTINGS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Get site settings (served from RAM if fresh, queried from Supabase on cache miss)
async function getSiteSettings(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedSiteSettings && (now - cachedSiteSettingsTime < SITE_SETTINGS_CACHE_TTL)) {
    return cachedSiteSettings;
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  const row = data || { phones: [], emails: [], social_links: {}, logo: null, slides: [] };
  // Normalize slides: support both [{url, link, ...}] objects and plain URL strings
  if (Array.isArray(row.slides)) {
    row.slides = row.slides.map(s => {
      if (typeof s === 'string') {
        return { url: s, link: '', link_type: 'none', target_id: '', title: '' };
      }
      if (typeof s === 'object' && s !== null && s.url) {
        return {
          url: s.url,
          link: s.link || '',
          link_type: s.link_type || (s.link ? 'custom' : 'none'),
          target_id: s.target_id || '',
          title: s.title || ''
        };
      }
      return null;
    }).filter(Boolean);
  } else {
    row.slides = [];
  }
  // Normalize phones/emails to arrays of strings
  if (!Array.isArray(row.phones)) row.phones = row.phones ? [row.phones] : [];
  if (!Array.isArray(row.emails)) row.emails = row.emails ? [row.emails] : [];
  if (!row.social_links || typeof row.social_links !== 'object') row.social_links = {};

  cachedSiteSettings = row;
  cachedSiteSettingsTime = now;
  return row;
}

// Update site settings in Supabase (upsert single row id=1) and invalidate RAM cache
async function updateSiteSettings(fields) {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert([{ id: 1, ...fields, updated_at: new Date().toISOString() }], { onConflict: 'id' })
    .select();
  if (error) {
    console.error('[updateSiteSettings] Supabase error:', JSON.stringify(error));
    throw error;
  }
  // Invalidate cache immediately on update so changes reflect immediately
  cachedSiteSettings = null;
  cachedSiteSettingsTime = 0;
  return data && data[0] ? data[0] : fields;
}

// Upload buffer to Supabase Storage (branding bucket) and return public URL
async function uploadToSupabaseBranding(fileBuffer, fileName, mimetype) {
  const { data, error } = await supabase.storage.from('branding').upload(fileName, fileBuffer, {
    contentType: mimetype,
    upsert: true
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('branding').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// Remove file from Supabase Storage by public URL
async function removeFromSupabaseBranding(publicUrl) {
  if (!publicUrl) return;
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split('/');
    const brandingIdx = parts.indexOf('branding');
    if (brandingIdx !== -1 && parts.length > brandingIdx + 1) {
      const filePath = parts.slice(brandingIdx + 1).join('/');
      await supabase.storage.from('branding').remove([filePath]);
    }
  } catch (e) { /* ignore */ }
}

// --- API: /api/site-settings (GET) — public endpoint ---
app.get('/api/site-settings', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في تحميل إعدادات الموقع', details: e.message });
  }
});

// --- API: /api/branding (GET) — COMPATIBILITY SHIM (maps site_settings → old branding shape) ---
app.get('/api/branding', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    const sl = settings.social_links || {};
    const phones = settings.phones || [];
    const emails = settings.emails || [];
    const slides = settings.slides || [];
    // Map to old branding format
    const branding = {
      logo: settings.logo || null,
      facebook: sl.facebook || null,
      instagram: sl.instagram || null,
      tiktok: sl.tiktok || null,
      youtube: sl.youtube || null,
      whatsapp: sl.whatsapp || null,
      phone: phones[0] || null,
      email: emails[0] || null,
      cover1: (slides[0] && (slides[0].url || slides[0])) || null,
      cover2: (slides[1] && (slides[1].url || slides[1])) || null,
      cover3: (slides[2] && (slides[2].url || slides[2])) || null,
      // Extra: expose full arrays for new code
      phones,
      emails,
      social_links: sl,
      slides
    };
    res.json(branding);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في تحميل بيانات العلامة التجارية', details: e.message });
  }
});



// --- API: /api/admin/site-settings (GET) — admin only ---
app.get('/api/admin/site-settings', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const settings = await getSiteSettings();
    res.json(settings);
  } catch (e) {
    res.status(401).json({ error: 'رمز غير صالح', details: e.message });
  }
});

// --- API: /api/admin/site-settings (POST) — save phones, emails, social_links ---
app.post('/api/admin/site-settings', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const { phones, emails, social_links } = req.body;
    const updateFields = {};
    if (Array.isArray(phones)) updateFields.phones = phones;
    if (Array.isArray(emails)) updateFields.emails = emails;
    if (social_links && typeof social_links === 'object') updateFields.social_links = social_links;
    const result = await updateSiteSettings(updateFields);
    res.json({ message: 'تم الحفظ بنجاح', settings: result });
  } catch (e) {
    console.error('[site-settings POST] Error:', e.message, e);
    res.status(500).json({ error: 'خطأ في الحفظ', details: e.message });
  }
});

// --- API: /api/admin/site-settings/logo (POST) — upload logo ---
app.post('/api/admin/site-settings/logo', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const formidable = require('formidable');
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        let file = files.logo;
        if (Array.isArray(file)) file = file[0];
        if (err || !file || !file.filepath) return res.status(400).json({ error: 'لم يتم تحميل الشعار.' });
        const settings = await getSiteSettings();
        if (settings.logo) await removeFromSupabaseBranding(settings.logo);
        const fsPromises = require('fs').promises;
        const fileBuffer = await fsPromises.readFile(file.filepath);
        const ext = (file.originalFilename || 'logo.png').split('.').pop();
        const fileName = `logo.${ext}`;
        const publicUrl = await uploadToSupabaseBranding(fileBuffer, fileName, file.mimetype || 'image/png');
        await updateSiteSettings({ logo: publicUrl });
        res.json({ message: 'تم تحديث الشعار بنجاح!', logo: publicUrl });
      } catch (e) {
        console.error('[logo upload callback]', e.message);
        if (!res.headersSent) res.status(500).json({ error: 'خطأ أثناء تحديث الشعار', details: e.message });
      }
    });
  } catch (e) {
    console.error('[logo upload outer]', e.message);
    res.status(500).json({ error: 'خطأ أثناء تحديث الشعار', details: e.message });
  }
});

// Helper to sanitize slide link URLs
function sanitizeSlideLink(rawLink) {
  if (!rawLink || typeof rawLink !== 'string') return '';
  const trimmed = rawLink.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

// --- API: /api/admin/site-settings/slide (POST) — add or replace a slide ---
app.post('/api/admin/site-settings/slide', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const formidable = require('formidable');
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      try {
        let file = files.slide;
        if (Array.isArray(file)) file = file[0];
        let index = fields.index;
        if (Array.isArray(index)) index = index[0];
        index = parseInt(index, 10);

        let link = fields.link;
        if (Array.isArray(link)) link = link[0];
        let link_type = fields.link_type;
        if (Array.isArray(link_type)) link_type = link_type[0];
        let target_id = fields.target_id;
        if (Array.isArray(target_id)) target_id = target_id[0];
        let title = fields.title;
        if (Array.isArray(title)) title = title[0];

        if (err || !file || !file.filepath) return res.status(400).json({ error: 'لم يتم تحميل صورة السلايد.' });
        const settings = await getSiteSettings();
        const slides = Array.isArray(settings.slides) ? [...settings.slides] : [];
        if (isNaN(index) && slides.length >= 7) {
          return res.status(400).json({ error: 'الحد الأقصى للسلايدات هو 7.' });
        }
        if (!isNaN(index) && slides[index]) {
          const oldUrl = typeof slides[index] === 'object' ? slides[index].url : slides[index];
          if (oldUrl) await removeFromSupabaseBranding(oldUrl);
        }
        const fsPromises = require('fs').promises;
        const fileBuffer = await fsPromises.readFile(file.filepath);
        const ext = (file.originalFilename || 'slide.png').split('.').pop();
        const slideIdx = !isNaN(index) ? index : slides.length;
        const fileName = `slide_${slideIdx}_${Date.now()}.${ext}`;
        const publicUrl = await uploadToSupabaseBranding(fileBuffer, fileName, file.mimetype || 'image/png');

        const safeLink = sanitizeSlideLink(link);
        const existingSlide = !isNaN(index) && slides[index] && typeof slides[index] === 'object' ? slides[index] : null;
        const newSlide = {
          url: publicUrl,
          link: safeLink || (existingSlide ? existingSlide.link : ''),
          link_type: link_type || (existingSlide ? existingSlide.link_type : (safeLink ? 'custom' : 'none')),
          target_id: target_id || (existingSlide ? existingSlide.target_id : ''),
          title: title || (existingSlide ? existingSlide.title : '')
        };

        if (!isNaN(index)) {
          slides[index] = newSlide;
        } else {
          slides.push(newSlide);
        }
        await updateSiteSettings({ slides });
        res.json({ message: 'تم تحديث السلايد بنجاح!', slides, url: publicUrl });
      } catch (e) {
        console.error('[slide upload callback]', e.message);
        if (!res.headersSent) res.status(500).json({ error: 'خطأ أثناء تحديث السلايد', details: e.message });
      }
    });
  } catch (e) {
    console.error('[slide upload outer]', e.message);
    res.status(500).json({ error: 'خطأ أثناء تحديث السلايد', details: e.message });
  }
});

// --- API: /api/admin/site-settings/slide/:index/link (PUT) — update slide link/target without reuploading ---
app.put('/api/admin/site-settings/slide/:index/link', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const index = parseInt(req.params.index, 10);
    const settings = await getSiteSettings();
    const slides = Array.isArray(settings.slides) ? [...settings.slides] : [];
    if (isNaN(index) || index < 0 || index >= slides.length) {
      return res.status(400).json({ error: 'رقم السلايد غير صالح.' });
    }
    const current = typeof slides[index] === 'object' ? slides[index] : { url: slides[index] };
    const safeLink = sanitizeSlideLink(req.body.link);
    slides[index] = {
      ...current,
      link: safeLink,
      link_type: req.body.link_type || (safeLink ? 'custom' : 'none'),
      target_id: req.body.target_id ? String(req.body.target_id) : '',
      title: req.body.title || ''
    };
    await updateSiteSettings({ slides });
    res.json({ message: 'تم تحديث رابط السلايد بنجاح!', slides });
  } catch (e) {
    res.status(500).json({ error: 'خطأ أثناء تحديث رابط السلايد', details: e.message });
  }
});

// --- API: /api/admin/site-settings/slide/:index (DELETE) — remove a slide ---
app.delete('/api/admin/site-settings/slide/:index', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const index = parseInt(req.params.index, 10);
    const settings = await getSiteSettings();
    const slides = Array.isArray(settings.slides) ? [...settings.slides] : [];
    if (slides.length <= 1) return res.status(400).json({ error: 'يجب أن يكون هناك سلايد واحد على الأقل.' });
    if (isNaN(index) || index < 0 || index >= slides.length) return res.status(400).json({ error: 'رقم السلايد غير صالح.' });
    // Remove from storage
    const targetSlide = slides[index];
    const targetUrl = typeof targetSlide === 'object' ? targetSlide.url : targetSlide;
    if (targetUrl) await removeFromSupabaseBranding(targetUrl);
    slides.splice(index, 1);
    await updateSiteSettings({ slides });
    res.json({ message: 'تم حذف السلايد بنجاح!', slides });
  } catch (e) {
    res.status(500).json({ error: 'خطأ أثناء حذف السلايد', details: e.message });
  }
});

// --- Legacy compatibility: /api/admin/branding (POST) — maps to site_settings ---
app.post('/api/admin/branding', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    const sl = { ...(settings.social_links || {}) };
    const phones = [...(settings.phones || [])];
    const emails = [...(settings.emails || [])];
    if (req.body.facebook !== undefined) sl.facebook = req.body.facebook;
    if (req.body.instagram !== undefined) sl.instagram = req.body.instagram;
    if (req.body.tiktok !== undefined) sl.tiktok = req.body.tiktok;
    if (req.body.phone !== undefined) phones[0] = req.body.phone;
    if (req.body.email !== undefined) emails[0] = req.body.email;
    await updateSiteSettings({ social_links: sl, phones, emails });
    res.json({ message: 'تم الحفظ' });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الحفظ', details: e.message });
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


