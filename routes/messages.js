const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
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
        const { data, error } = await supabase
            .from('Messages')
            .insert([{ user_id: userId, full_name, phone_number, subject, message_text, sent_at }])
            .select('id');
        if (error) throw error;
        res.json({ message: 'شكرا لتواصلكم معنا سيتم معالجة طلبكم في اقرب وقت', messageId: data[0].id });
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
    try {
        const { data, error } = await supabase
            .from('Messages')
            .select('id, message_text, subject, sent_at, full_name, phone_number, user_id, Users(name, email)')
            .or('archive_status.is.null,archive_status.eq.live')
            .order('sent_at', { ascending: false });
        if (error) throw error;
        // Map user_name and user_email
        const rows = (data || []).map(m => ({
            ...m,
            user_name: m.Users?.name,
            user_email: m.Users?.email
        }));
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
        const { error } = await supabase
            .from('Messages')
            .update({ archive_status: 'archived' })
            .eq('id', messageId);
        if (error) throw error;
        res.json({ message: 'تم أرشفة الرسالة' });
    } catch (err) {
        console.error('Arşivleme işlemi sırasında hata:', err);
        res.status(500).json({ error: 'لم تتم الأرشفة' });
    }
});

module.exports = router;
