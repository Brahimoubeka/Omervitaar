const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

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
    console.log('Product', pid, 'ratings:', ratingNumbers, 'avg:', avgRating);
  }
  return { avgRating, reviewCount };
}

// GET /api/products
router.get('/products', async (req, res) => {
  const { category, limit } = req.query;
  try {
    let products;
    if (category) {
      const { data, error } = await supabase
        .from('Products')
        .select('*')
        .in('id',
          (await supabase
            .from('ProductCategories')
            .select('product_id')
            .eq('category_id', category)).data?.map(pc => pc.product_id) || []
        )
        .order('id', { ascending: false })
        .limit(limit || 3);
      if (error) throw error;
      products = data;
    } else {
      const { data, error } = await supabase.from('Products').select('*');
      if (error) throw error;
      products = data;
    }
    for (const product of products) {
      // --- Fix: Always send name/description as string ---
      product.name = Array.isArray(product.name) ? (product.name[0] || '') : (product.name || '');
      product.description = Array.isArray(product.description) ? (product.description[0] || '') : (product.description || '');
      product.categories = await getCategoriesForProduct(product.id);
      product.thumbnail = await getFirstImageForProduct(product.id) || product.imagePath || 'images/default-product.jpg';
      const stats = await getProductRatingStats(product.id);
      product.avgRating = stats.avgRating;
      product.reviewCount = stats.reviewCount;
      console.log(`Product ${product.id} avgRating:`, product.avgRating, 'reviewCount:', product.reviewCount);
    }
    res.json(products);
  } catch (err) {
    console.error('Error retrieving product:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/products/paginate?offset=0&limit=8
router.get('/products/paginate', async (req, res) => {
  let { offset, limit } = req.query;
  offset = parseInt(offset, 10) || 0;
  limit = parseInt(limit, 10) || 8;
  try {
    const { data, error } = await supabase
      .from('Products')
      .select('*')
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    // Add categories, thumbnail, avgRating, reviewCount, and images for each product
    for (const product of data) {
      product.categories = await getCategoriesForProduct(product.id);
      product.thumbnail = await getFirstImageForProduct(product.id) || product.imagePath || 'images/default-product.jpg';
      const stats = await getProductRatingStats(product.id);
      product.avgRating = stats.avgRating;
      product.reviewCount = stats.reviewCount;
      // Add images array for carousel
      const { data: imgRows, error: imgError } = await supabase
        .from('ProductImages')
        .select('imagePath')
        .eq('product_id', product.id)
        .order('id', { ascending: true });
      if (imgError) throw imgError;
      product.images = imgRows.length > 0 ? imgRows.map(r => r.imagePath) : (product.imagePath ? [product.imagePath] : []);
    }
    res.json(data);
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
      .order('id', { ascending: false })
      .limit(2);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Son ürünler alınırken veritabanı hatası.' });
  }
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const { data, error } = await supabase
      .from('Products')
      .select('*')
      .eq('id', productId);
    if (error) throw error;
    const row = data[0];
    if (!row) return res.status(404).json({ error: 'لم يتم العثور على المنتج' });
    row.categories = await getCategoriesForProduct(row.id);
    row.thumbnail = await getFirstImageForProduct(row.id) || row.imagePath || 'images/default-product.jpg';
    const stats = await getProductRatingStats(row.id);
    row.avgRating = stats.avgRating;
    row.reviewCount = stats.reviewCount;
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
    res.json(data);
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
