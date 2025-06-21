const express = require('express');
const router = express.Router();
const db = require('../db');
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
    const query = `
      SELECT r.*, u."name" AS "userName"
      FROM "Reviews" r
      JOIN "Users" u ON r."user_id" = u."id"
      WHERE r."product_id" = $1
      ORDER BY r."created_at" DESC
    `;
    try {
        const { rows } = await db.query(query, [productId]);
        res.json(rows);
    } catch (err) {
        console.error('Yorumlar alınırken veritabanı hatası:', err);
        res.status(500).json({ error: 'Yorumlar alınırken veritabanı hatası.' });
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

    const insertQuery = `
      INSERT INTO "Reviews" ("product_id", "user_id", "rating", "comment", "created_at")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING "id"
    `;
    try {
        const { rows } = await db.query(insertQuery, [
            product_id,
            user_id,
            rating,
            comment || '',
            created_at,
        ]);
        res.json({ message: 'Yorum başarıyla eklendi.', reviewId: rows[0].id });
    } catch (err) {
        console.error('Yorum eklenirken veritabanı hatası:', err);
        res.status(500).json({ error: 'Yorum eklenirken veritabanı hatası.' });
    }
});

module.exports = router;
