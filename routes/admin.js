const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const secret = process.env.JWT_SECRET;

console.log('JWT Secret:', process.env.JWT_SECRET);

// Multer for image uploads (multiple)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// Middleware to verify admin access
function verifyAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Token bulunamadı.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token bulunamadı.' });
    }
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token doğrulanamadı.' });
        }
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Yönetici erişimi gerekli.' });
        }
        req.user = decoded;
        next();
    });
}

// Helper: Get all categories for a product
async function getCategoriesForProduct(productId) {
    const { rows } = await db.query(
        `SELECT c."name", c."id" FROM "Categories" c
         INNER JOIN "ProductCategories" pc ON c."id" = pc."category_id"
         WHERE pc."product_id" = $1`,
        [productId]
    );
    return rows.map(row => ({ id: row.id, name: row.name }));
}

// Route: Get all categories (for frontend picker)
router.get('/admin/categories', verifyAdmin, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM "Categories"');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Route: Get all products with categories
router.get('/admin/products', verifyAdmin, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM "Products"');
        const productsWithCategories = await Promise.all(rows.map(async (product) => {
            product.categories = await getCategoriesForProduct(product.id);
            return product;
        }));
        res.json(productsWithCategories);
    } catch (err) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Route: Add product with categories and image minimization
router.post('/admin/products', verifyAdmin, upload.array('images', 5), async (req, res) => {
    const { name, description, price, stock } = req.body;
    let categories = [];
    if (req.body.categories) {
        categories = Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories];
    }
    if (!name || !price || !stock) {
        return res.status(400).json({ error: 'Gerekli alanlar eksik.' });
    }
    try {
        // Insert Product
        const { rows } = await db.query(
            'INSERT INTO "Products" ("name", "description", "price", "stock") VALUES ($1, $2, $3, $4) RETURNING "id"',
            [name, description, price, stock]
        );
        const productId = rows[0].id;
        // Insert ProductCategories
        if (categories.length > 0) {
            for (const catId of categories) {
                await db.query(
                    'INSERT INTO "ProductCategories" ("product_id", "category_id") VALUES ($1, $2)',
                    [productId, catId]
                );
            }
        }
        // Save and minimize images
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const inputPath = file.path;
                // Create minimized file path
                const compressedPath = inputPath.replace(/(\.[\w\d_-]+)$/i, '_min$1');
                // Minimize and save image
                await sharp(inputPath)
                    .resize({ width: 800 }) // Max width
                    .jpeg({ quality: 70 })  // Compression quality
                    .toFile(compressedPath);
                // Delete original file
                fs.unlinkSync(inputPath);
                // Save minimized filename in DB
                const compressedFilename = path.basename(compressedPath);
                await db.query(
                    'INSERT INTO "ProductImages" ("product_id", "imagePath") VALUES ($1, $2)',
                    [productId, 'uploads/' + compressedFilename]
                );
            }
            res.json({ message: 'تم اضافة المنتج.', productId });
        } else {
            res.json({ message: 'تم اضافة منتج من دون صور', productId });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Route: Update product with categories and image minimization
router.put('/admin/products/:id', verifyAdmin, upload.array('images', 5), async (req, res) => {
    const productId = req.params.id;
    const { name, description, price, stock } = req.body;
    let categories = [];
    if (req.body.categories) {
        categories = Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories];
    }
    try {
        await db.query(
            'UPDATE "Products" SET "name" = $1, "description" = $2, "price" = $3, "stock" = $4 WHERE "id" = $5',
            [name, description, price, stock, productId]
        );
        // Remove old categories
        await db.query('DELETE FROM "ProductCategories" WHERE "product_id" = $1', [productId]);
        // Add new categories
        for (const catId of categories) {
            await db.query(
                'INSERT INTO "ProductCategories" ("product_id", "category_id") VALUES ($1, $2)',
                [productId, catId]
            );
        }
        // Handle images
        if (req.files && req.files.length > 0) {
            // 1. Fetch all old image paths
            const { rows: images } = await db.query('SELECT "imagePath" FROM "ProductImages" WHERE "product_id" = $1', [productId]);
            // 2. Delete files from disk
            for (const img of images) {
                const filePath = path.join(__dirname, '../public', img.imagePath);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            // 3. Delete DB records
            await db.query('DELETE FROM "ProductImages" WHERE "product_id" = $1', [productId]);
            // 4. Save and minimize new images
            for (const file of req.files) {
                const inputPath = file.path;
                const compressedPath = inputPath.replace(/(\.[\w\d_-]+)$/i, '_min$1');
                await sharp(inputPath)
                    .resize({ width: 800 })
                    .jpeg({ quality: 70 })
                    .toFile(compressedPath);
                fs.unlinkSync(inputPath);
                const compressedFilename = path.basename(compressedPath);
                await db.query(
                    'INSERT INTO "ProductImages" ("product_id", "imagePath") VALUES ($1, $2)',
                    [productId, 'uploads/' + compressedFilename]
                );
            }
            res.json({ message: 'تم تحديث المنتج' });
        } else {
            res.json({ message: 'تم تحديث معلومات المنتج' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Route: Delete a product (removes reviews, orders, images, categories, visits, and files)
router.delete('/admin/products/:id', verifyAdmin, async (req, res) => {
    const productId = req.params.id;
    try {
        // Start a transaction
        await db.query('BEGIN');

        try {
            // 0. Delete product visits
            await db.query('DELETE FROM "ProductVisits" WHERE "product_id" = $1', [productId]);

            // 1. Delete reviews for this product
            await db.query('DELETE FROM "Reviews" WHERE "product_id" = $1', [productId]);

            // 2. Delete orders for this product
            await db.query('DELETE FROM "Orders" WHERE "product_id" = $1', [productId]);

            // 3. Fetch all image paths for this product
            const { rows: images } = await db.query('SELECT "imagePath" FROM "ProductImages" WHERE "product_id" = $1', [productId]);

            // 4. Delete files from disk
            for (const img of images) {
                const filePath = path.join(__dirname, '../public', img.imagePath);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error(`Error deleting file ${filePath}:`, err);
                        // Continue with deletion even if file removal fails
                    }
                }
            }

            // 5. Remove images and categories from DB
            await db.query('DELETE FROM "ProductImages" WHERE "product_id" = $1', [productId]);
            await db.query('DELETE FROM "ProductCategories" WHERE "product_id" = $1', [productId]);

            // 6. Finally remove the product
            await db.query('DELETE FROM "Products" WHERE "id" = $1', [productId]);

            // Commit the transaction
            await db.query('COMMIT');

            res.json({ message: 'تم حذف المنتج وجميع البيانات المرتبطة به بنجاح.' });
        } catch (err) {
            // If anything fails, roll back the transaction
            await db.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ 
            error: 'حدث خطأ أثناء حذف المنتج.', 
            details: err.message 
        });
    }
});

// Route: Get product images by product ID
router.get('/products/:id/images', async (req, res) => {
    const productId = req.params.id;
    try {
        const { rows } = await db.query('SELECT "imagePath" FROM "ProductImages" WHERE "product_id" = $1', [productId]);
        res.json(rows.map(row => row.imagePath));
    } catch (err) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});






// --- Upload logo ---
const brandingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/images'));
    },
    filename: function (req, file, cb) {
        cb(null, 'logo.png'); // Always overwrite logo.png
    }
});
const brandingUpload = multer({ storage: brandingStorage });

// Upload logo image (POST /api/admin/logo)
router.post('/admin/logo', verifyAdmin, brandingUpload.single('logo'), (req, res) => {
    res.json({ message: 'تم تحديث اللوجو LOGO' });
});

// --- Upload cover slide ---
const slideStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/images'));
    },
    filename: function (req, file, cb) {
        // filename: cover1.png, cover2.png, cover3.png, etc
        const idx = req.body.index || 1; // 1 by default, support 1, 2, 3...
        cb(null, `cover${idx}.png`);
    }
});
const slideUpload = multer({ storage: slideStorage });

router.post('/admin/slide', verifyAdmin, slideUpload.single('slide'), (req, res) => {
    res.json({ message: 'تم تحديث صورة الغلاف' });
});








//updating social links and phone number
const brandingPath = path.join(__dirname, '../public/branding.json');

// Helper to get branding info
function getBranding() {
  if (!fs.existsSync(brandingPath)) {
    // Default if file doesn't exist
    return {
      facebook: "",
      instagram: "",
      tiktok: "",
      phone: ""
    };
  }
  return JSON.parse(fs.readFileSync(brandingPath, 'utf-8'));
}

// Get branding info (public, no auth)
router.get('/branding', (req, res) => {
  res.json(getBranding());
});

// Update branding info (admin only)
router.post('/admin/branding', verifyAdmin, (req, res) => {
  const { facebook, instagram, tiktok, phone } = req.body;
  const updated = { facebook, instagram, tiktok, phone };
  fs.writeFileSync(brandingPath, JSON.stringify(updated, null, 2));
  res.json({ message: 'تم تحديث المعلومات بنجاح', branding: updated });
});




module.exports = router;
