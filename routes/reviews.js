const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

console.log('JWT Secret:', process.env.JWT_SECRET);

// JWT verification middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token bulunamadı.' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, secret, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Geçersiz token.' });
        req.user = decoded;
        next();
    });
}

// GET /api/products/:id/reviews - Get reviews for a specific product
router.get('/products/:id/reviews', async (req, res) => {
    const productId = req.params.id;
    try {
        const { data, error } = await supabase
            .from('Reviews')
            .select('*, Users(name)')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        // Map userName
        const rows = (data || []).map(r => ({
            ...r,
            userName: r.Users?.name
        }));
        res.json(rows);
    } catch (err) {
        console.error('Yorumlar alınırken veritabanı hatası:', err);
        res.status(500).json({ error: 'حدث خطأ حاول تسجيل الدخول' });
    }
});

// POST /api/reviews - Add a new review (requires login)
router.post('/reviews', verifyToken, async (req, res) => {
    const { product_id, rating, comment } = req.body;
    const user_id = req.user.userId;
    const created_at = new Date().toISOString();

    if (!product_id || !rating) {
        return res.status(400).json({ error: 'Ürün ID ve puan gereklidir.' });
    }

    // Ensure rating and product_id are stored as numbers
    const numericRating = Number(rating);
    const numericProductId = Number(product_id);
    if (!numericProductId || isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ error: 'Ürün ID ve puan gereklidir ve puan 1 ile 5 arasında olmalıdır.' });
    }

    try {
        const insertPayload = { product_id: numericProductId, user_id, rating: numericRating, comment: comment || '', created_at };
        console.log('Review insert payload:', insertPayload);
        const { data, error } = await supabase
            .from('Reviews')
            .insert([insertPayload])
            .select('id');
        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: 'Supabase insert error', details: error });
        }
        res.json({ message: 'شكرا على تقييمك!', reviewId: data[0].id });
    } catch (err) {
        console.error('Yorum eklenirken veritabanı hatası:', err);
        res.status(500).json({ error: 'Yorum eklenirken veritabanı hatası.', details: err });
    }
});

module.exports = router;
