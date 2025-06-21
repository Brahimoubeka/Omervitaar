const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

console.log('JWT Secret:', process.env.JWT_SECRET);

// Middleware to optionally verify JWT for logged-in users
function optionalVerifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        req.user = null; // Guest
        return next();
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        req.user = null;
        return next();
    }
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            req.user = null;
            return next();
        }
        req.user = decoded;
        next();
    });
}

// POST /api/messages - Anyone (user or guest) can send a message to admin
router.post('/messages', optionalVerifyToken, async (req, res) => {
    const userId = req.user ? req.user.userId : null;
    const { full_name, phone_number, subject, message_text } = req.body;

    if (!message_text) {
        return res.status(400).json({ error: 'أكتب رسالتك !' });
    }
    if (!userId && (!full_name || !phone_number)) {
        return res.status(400).json({ error: 'الاسم ورقم الهاتف للتواصل معكم' });
    }
    const sent_at = new Date().toISOString();

    try {
        const { rows } = await db.query(
            `INSERT INTO "Messages" ("user_id", "full_name", "phone_number", "subject", "message_text", "sent_at")
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id"`,
            [userId, full_name, phone_number, subject, message_text, sent_at]
        );
        res.json({ message: 'شكرا لتواصلكم معنا سيتم معالجة طلبكم في اقرب وقت', messageId: rows[0].id });
    } catch (err) {
        console.error('Mesaj eklenirken hata oluştu:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// GET /api/admin/messages - Admin retrieves all unarchived messages
router.get('/admin/messages', optionalVerifyToken, async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yönetici erişimi gerekli.' });
    }
    const query = `
        SELECT 
            m."id",
            m."message_text",
            m."subject",
            m."sent_at",
            m."full_name",
            m."phone_number",
            m."user_id",
            u."name" AS "user_name",
            u."email" AS "user_email"
        FROM "Messages" m
        LEFT JOIN "Users" u ON m."user_id" = u."id"
        WHERE m."archive_status" IS NULL OR m."archive_status" = 'live'
        ORDER BY m."sent_at" DESC
    `;
    try {
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Mesajlar alınırken hata oluştu:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// PATCH /api/admin/messages/:id/archive - Admin archives a message
router.patch('/admin/messages/:id/archive', optionalVerifyToken, async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yönetici erişimi gerekli.' });
    }
    const messageId = req.params.id;
    try {
        await db.query(
            `UPDATE "Messages" SET "archive_status" = 'archived' WHERE "id" = $1`,
            [messageId]
        );
        res.json({ message: 'تم أرشفة الرسالة' });
    } catch (err) {
        console.error('Arşivleme işlemi sırasında hata:', err);
        res.status(500).json({ error: 'لم تتم الأرشفة' });
    }
});

module.exports = router;
