const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const secret = process.env.JWT_SECRET;
const path = require('path');
const fs = require('fs');

// Helper: Upload buffer to Supabase Storage and return public URL
async function uploadToSupabaseStorage(bucket, fileName, buffer, mimetype) {
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, buffer, {
        contentType: mimetype,
        upsert: true
    });
    if (error) throw error;
    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
}

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
    // Supabase join: ProductCategories.category_id -> Categories.id
    const { data, error } = await supabase
        .from('ProductCategories')
        .select('category_id, Categories(id, name)')
        .eq('product_id', productId);
    if (error) throw error;
    // Defensive: filter out nulls
    return (data || []).filter(row => row.Categories).map(row => ({ id: row.Categories.id, name: row.Categories.name }));
}

// Route: Get all categories (for frontend picker)
router.get('/admin/categories', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('Categories').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
    }
});

// Route: Get all products with categories
router.get('/admin/products', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('Products').select('*');
        if (error) throw error;
        // For each product, fetch categories and images
        const productsWithDetails = await Promise.all((data || []).map(async (product) => {
            product.categories = await getCategoriesForProduct(product.id);
            // Fetch images for this product
            const { data: images } = await supabase.from('ProductImages').select('imagePath').eq('product_id', product.id);
            product.images = (images || []).map(img => img.imagePath);
            // --- Fix: Always send name/description as string ---
            product.name = Array.isArray(product.name) ? (product.name[0] || '') : (product.name || '');
            product.description = Array.isArray(product.description) ? (product.description[0] || '') : (product.description || '');
            return product;
        }));
        res.json(productsWithDetails);
    } catch (err) {
        res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
    }
});

// Route: Add product with categories and image minimization
router.post('/admin/products', verifyAdmin, async (req, res) => {
    // Use formidable for parsing multipart form data
    const formidable = require('formidable');
    const form = new formidable.IncomingForm({ multiples: true });
    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(400).json({ error: 'Form verisi alınamadı.' });
        let name = fields.name;
        let description = fields.description;
        let price = fields.price;
        let stock = fields.stock;
        let categories = [];
        if (fields.categories) {
            categories = Array.isArray(fields.categories) ? fields.categories : [fields.categories];
        }
        let paragraphs = [];
        if (fields.paragraphs) {
            try { paragraphs = JSON.parse(fields.paragraphs); } catch (e) { paragraphs = []; }
        }
        // Fix: If name/description are arrays, use first element
        if (Array.isArray(name)) name = name[0];
        if (Array.isArray(description)) description = description[0];
        // Parse price and stock to numbers (handle array case)
        if (Array.isArray(price)) price = price[0];
        if (Array.isArray(stock)) stock = stock[0];
        price = parseFloat(price);
        stock = parseInt(stock);
        if (!name || isNaN(price) || isNaN(stock)) {
            return res.status(400).json({ error: 'Gerekli alanlar eksik veya hatalı.' });
        }
        try {
            // Insert Product
            const { data: productData, error: productError } = await supabase
                .from('Products')
                .insert([{ name, description, price, stock, paragraphs }])
                .select('id');
            if (productError) throw productError;
            const productId = productData[0].id;
            // Insert ProductCategories
            if (categories.length > 0) {
                for (const catId of categories) {
                    const { error: catError } = await supabase
                        .from('ProductCategories')
                        .insert([{ product_id: productId, category_id: catId }]);
                    if (catError) throw catError;
                }
            }
            // Save and minimize images to Supabase Storage
            const images = files.images ? (Array.isArray(files.images) ? files.images : [files.images]) : [];
            if (images.length > 0) {
                for (const file of images) {
                    // Minimize image
                    const buffer = await sharp(file.filepath).resize({ width: 800 }).jpeg({ quality: 70 }).toBuffer();
                    const ext = file.originalFilename.split('.').pop();
                    const fileName = `products/${productId}_${Date.now()}_${Math.floor(Math.random() * 1e6)}.jpeg`;
                    const publicUrl = await uploadToSupabaseStorage('product-images', fileName, buffer, 'image/jpeg');
                    const { error: imgError } = await supabase
                        .from('ProductImages')
                        .insert([{ product_id: productId, imagePath: publicUrl }]);
                    if (imgError) throw imgError;
                }
                res.json({ message: 'تم اضافة المنتج.', productId });
            } else {
                res.json({ message: 'تم اضافة منتج من دون صور', productId });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
        }
    });
});

// Route: Update product with categories and image minimization
router.put('/admin/products/:id', verifyAdmin, async (req, res) => {
    const productId = req.params.id;
    // Use formidable for parsing multipart form data
    const formidable = require('formidable');
    const form = new formidable.IncomingForm({ multiples: true });
    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(400).json({ error: 'Form verisi alınamadı.' });
        let name = fields.name;
        let description = fields.description;
        let price = fields.price;
        let stock = fields.stock;
        let categories = [];
        if (fields.categories) {
            categories = Array.isArray(fields.categories) ? fields.categories : [fields.categories];
        }
        let paragraphs = [];
        if (fields.paragraphs) {
            try { paragraphs = JSON.parse(fields.paragraphs); } catch (e) { paragraphs = []; }
        }
        // --- Fix: If name/description are arrays, use first element ---
        if (Array.isArray(name)) name = name[0];
        if (Array.isArray(description)) description = description[0];
        // Parse price and stock to numbers (handle array case)
        if (Array.isArray(price)) price = price[0];
        if (Array.isArray(stock)) stock = stock[0];
        price = parseFloat(price);
        stock = parseInt(stock);
        if (!name || isNaN(price) || isNaN(stock)) {
            return res.status(400).json({ error: 'Gerekli alanlar eksik veya hatalı.' });
        }
        try {
            // Update product
            const { error: updateError } = await supabase
                .from('Products')
                .update({ name, description, price, stock, paragraphs })
                .eq('id', productId);
            if (updateError) throw updateError;
            // Remove old categories
            const { error: delCatError } = await supabase
                .from('ProductCategories')
                .delete()
                .eq('product_id', productId);
            if (delCatError) throw delCatError;
            // Add new categories
            for (const catId of categories) {
                const { error: addCatError } = await supabase
                    .from('ProductCategories')
                    .insert([{ product_id: productId, category_id: catId }]);
                if (addCatError) throw addCatError;
            }
            // Handle images
            // 1. Fetch all old image paths
            const { data: oldImages, error: imgFetchError } = await supabase
                .from('ProductImages')
                .select('id, imagePath')
                .eq('product_id', productId);
            if (imgFetchError) throw imgFetchError;

            // 2. Determine which old images to retain and which to delete
            let retainedImages = [];
            if (fields.retained_images) {
                let retainedStr = Array.isArray(fields.retained_images) ? fields.retained_images[0] : fields.retained_images;
                try { 
                    retainedImages = JSON.parse(retainedStr); 
                } catch(e) {
                    console.error("Error parsing retained_images:", e);
                }
            } else if (!files.images && oldImages) {
                // Legacy fallback: if no new images and no retained_images sent, keep all
                retainedImages = oldImages.map(img => img.imagePath);
            }

            const imagesToDelete = (oldImages || []).filter(img => !retainedImages.includes(img.imagePath));
            
            // 3. Delete removed images from Supabase Storage & DB
            for (const img of imagesToDelete) {
                const urlParts = img.imagePath.split('/');
                const fileName = urlParts.slice(-2).join('/'); // e.g. products/12345_xxx.jpeg
                await supabase.storage.from('product-images').remove([fileName]);
                await supabase.from('ProductImages').delete().eq('id', img.id);
            }

            // 4. Save and minimize NEW images to Supabase Storage
            const images = files.images ? (Array.isArray(files.images) ? files.images : [files.images]) : [];
            if (images.length > 0) {
                for (const file of images) {
                    const buffer = await sharp(file.filepath).resize({ width: 800 }).jpeg({ quality: 70 }).toBuffer();
                    const fileName = `products/${productId}_${Date.now()}_${Math.floor(Math.random() * 1e6)}.jpeg`;
                    const publicUrl = await uploadToSupabaseStorage('product-images', fileName, buffer, 'image/jpeg');
                    const { error: imgInsertError } = await supabase
                        .from('ProductImages')
                        .insert([{ product_id: productId, imagePath: publicUrl }]);
                    if (imgInsertError) throw imgInsertError;
                }
            }
            res.json({ message: 'تم تحديث المنتج بنجاح' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
        }
    });
});

// Route: Delete a product (removes reviews, orders, images, categories, visits, and files)
router.delete('/admin/products/:id', verifyAdmin, async (req, res) => {
    const productId = req.params.id;
    try {
        // Delete product visits
        await supabase.from('ProductVisits').delete().eq('product_id', productId);
        // Delete reviews
        await supabase.from('Reviews').delete().eq('product_id', productId);
        // Delete orders
        await supabase.from('Orders').delete().eq('product_id', productId);
        
        // Fetch and delete all images from Supabase Storage
        const { data: images } = await supabase.from('ProductImages').select('imagePath').eq('product_id', productId);
        if (images && images.length > 0) {
            for (const img of images) {
                if (img.imagePath && img.imagePath.includes('/storage/v1/object/public/')) {
                    const urlParts = img.imagePath.split('/');
                    const fileName = urlParts.slice(-2).join('/'); // e.g. products/12345_xxx.jpeg
                    await supabase.storage.from('product-images').remove([fileName]);
                }
            }
        }

        // Fetch main imagePath from Products table to delete if it exists
        const { data: mainProductData } = await supabase.from('Products').select('imagePath').eq('id', productId).single();
        if (mainProductData && mainProductData.imagePath && mainProductData.imagePath.includes('/storage/v1/object/public/')) {
            const urlParts = mainProductData.imagePath.split('/');
            const fileName = urlParts.slice(-2).join('/');
            await supabase.storage.from('product-images').remove([fileName]);
        }

        // Remove images and categories from DB
        await supabase.from('ProductImages').delete().eq('product_id', productId);
        await supabase.from('ProductCategories').delete().eq('product_id', productId);
        // Remove product
        await supabase.from('Products').delete().eq('id', productId);
        res.json({ message: 'تم حذف المنتج وجميع البيانات المرتبطة به بنجاح.' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف المنتج.', details: err.message });
    }
});

// Route: Get product images by product ID
router.get('/products/:id/images', async (req, res) => {
    const productId = req.params.id;
    try {
        const { data, error } = await supabase.from('ProductImages').select('imagePath').eq('product_id', productId);
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
    }
});

// Route: Toggle product active status
router.put('/admin/products/:id/toggle-active', verifyAdmin, async (req, res) => {
    const productId = req.params.id;
    const { is_active } = req.body;
    try {
        const { error } = await supabase
            .from('Products')
            .update({ is_active })
            .eq('id', productId);
        if (error) throw error;
        res.json({ message: 'تم تحديث حالة المنتج بنجاح' });
    } catch (err) {
        console.error('Error toggling product active status:', err);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة المنتج.' });
    }
});

module.exports = router;
