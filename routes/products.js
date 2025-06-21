const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Get categories for product
async function getCategoriesForProduct(productId) {
  const { rows } = await db.query(
    `SELECT "id", "name" FROM "Categories"
     INNER JOIN "ProductCategories" ON "Categories"."id" = "ProductCategories"."category_id"
     WHERE "ProductCategories"."product_id" = $1`,
    [productId]
  );
  return rows || [];
}

// Helper: Get first image for product
async function getFirstImageForProduct(productId) {
  const { rows } = await db.query(
    `SELECT "imagePath" FROM "ProductImages" WHERE "product_id" = $1 ORDER BY "id" ASC LIMIT 1`,
    [productId]
  );
  return rows[0]?.imagePath || null;
}

// // Helper: Get all images for product
// async function getImagesForProduct(productId) {
//   const { rows } = await db.query(
//     'SELECT "imagePath" FROM "ProductImages" WHERE "product_id" = $1 ORDER BY "id"',
//     [productId]
//   );
//   return rows.map(r => r.imagePath);
// }

// Helper: Get average rating and review count for a product
async function getProductRatingStats(productId) {
  const { rows } = await db.query(
    `SELECT AVG("rating") as "avgRating", COUNT(*) as "reviewCount" FROM "Reviews" WHERE "product_id" = $1`,
    [productId]
  );
  const row = rows[0];
  return {
    avgRating: row.avgRating ? parseFloat(row.avgRating) : null,
    reviewCount: row.reviewCount ? parseInt(row.reviewCount) : 0
  };
}

// GET /api/products
router.get('/products', async (req, res) => {
  const { category, limit } = req.query;
  try {
    let products;
    if (category) {
      const { rows } = await db.query(
        `SELECT DISTINCT p.* FROM "Products" p
         JOIN "ProductCategories" pc ON p."id" = pc."product_id"
         WHERE pc."category_id" = $1
         ORDER BY p."id" DESC LIMIT $2`,
        [category, limit || 3]
      );
      products = rows;
    } else {
      const { rows } = await db.query('SELECT * FROM "Products"');
      products = rows;
    }
    for (const product of products) {
      product.categories = await getCategoriesForProduct(product.id);
      product.thumbnail = await getFirstImageForProduct(product.id) || product.imagePath || 'images/default-product.jpg';
      const stats = await getProductRatingStats(product.id);
      product.avgRating = stats.avgRating;
      product.reviewCount = stats.reviewCount;
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
    const { rows } = await db.query('SELECT * FROM "Products" ORDER BY "id" DESC OFFSET $1 LIMIT $2', [offset, limit]);
    // Add categories, thumbnail, avgRating, reviewCount, and images for each product
    for (const product of rows) {
      product.categories = await getCategoriesForProduct(product.id);
      product.thumbnail = await getFirstImageForProduct(product.id) || product.imagePath || 'images/default-product.jpg';
      const stats = await getProductRatingStats(product.id);
      product.avgRating = stats.avgRating;
      product.reviewCount = stats.reviewCount;
      // Add images array for carousel
      const { rows: imgRows } = await db.query('SELECT "imagePath" FROM "ProductImages" WHERE "product_id" = $1 ORDER BY "id"', [product.id]);
      product.images = imgRows.length > 0 ? imgRows.map(r => r.imagePath) : (product.imagePath ? [product.imagePath] : []);
    }
    res.json(rows);
  } catch (err) {
    console.error('Error in /products/paginate:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/products/latest
router.get('/products/latest', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM "Products" ORDER BY "id" DESC LIMIT 2');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Son ürünler alınırken veritabanı hatası.' });
  }
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const { rows } = await db.query('SELECT * FROM "Products" WHERE "id" = $1', [productId]);
    const row = rows[0];
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
    const { rows } = await db.query('SELECT "imagePath" FROM "ProductImages" WHERE "product_id" = $1', [productId]);
    res.json(rows.map(row => row.imagePath));
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT "id", "name" FROM "Categories" ORDER BY "name" ASC');
    res.json(rows);
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
        await db.query(
            'INSERT INTO "ProductVisits" ("product_id", "user_id") VALUES ($1, $2)',
            [productId, userId]
        );
        res.json({ message: "Visit recorded" });
    } catch (err) {
        console.error("Error recording visit:", err);
        res.status(500).json({ error: 'Error recording visit' });
    }
});



module.exports = router;
