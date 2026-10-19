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

const { sendOrderEmail } = require('../utils/email');

// Helper to format message email for admin
function generateMessageEmailHtml({ senderName, phone, subject, messageText, sentAt }) {
    const dateStr = sentAt ? new Date(sentAt).toLocaleString('ar-DZ') : new Date().toLocaleString('ar-DZ');
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f4f6f8; padding: 25px 10px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #5a6344, #d6a848); padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">Omervita - رسالة جديدة من زائر</h2>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95; color: #ffffff;">تلقيت رسالة استفسار جديدة عبر الموقع</p>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px; font-weight: 600;">اسم المرسل:</td>
              <td style="padding: 8px 0; color: #222; font-weight: 700;">${senderName || 'زائر'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">رقم الهاتف / التواصل:</td>
              <td style="padding: 8px 0; color: #222; font-weight: 700; direction: ltr; text-align: right;">${phone || 'غير محدد'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">الموضوع:</td>
              <td style="padding: 8px 0; color: #222; font-weight: 600;">${subject || 'بدون موضوع'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">تاريخ الإرسال:</td>
              <td style="padding: 8px 0; color: #888; font-size: 13px;">${dateStr}</td>
            </tr>
          </table>
          <div style="background: #f8fafc; border-right: 4px solid #5a6344; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #5a6344; font-size: 14px;">نص الرسالة:</p>
            <p style="margin: 0; color: #333; line-height: 1.8; font-size: 15px; white-space: pre-wrap;">${messageText}</p>
          </div>
          <div style="text-align: center;">
            <a href="https://omervita.com/admin-messages" style="display: inline-block; background: #5a6344; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: 700; font-size: 14px;">
              عرض الرسائل في لوحة الإدارة
            </a>
          </div>
        </div>
      </div>
    </div>
    `;
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

        // Send email notification to admin
        try {
            const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
            if (adminEmail) {
                const senderDisplayName = full_name || (req.user ? (req.user.name || req.user.email) : 'زائر');
                const senderContact = phone_number || (req.user ? req.user.email : '');
                const emailHtml = generateMessageEmailHtml({
                    senderName: senderDisplayName,
                    phone: senderContact,
                    subject: subject || 'استفسار جديد',
                    messageText: message_text,
                    sentAt: sent_at
                });

                await sendOrderEmail(
                    adminEmail,
                    `رسالة جديدة من الموقع: ${subject || senderDisplayName || 'استفسار جديد'} - Omervita`,
                    emailHtml
                );
            }
        } catch (mailErr) {
            console.error('فشل إرسال إشعار الرسالة للبريد:', mailErr.message);
            // Don't fail the message submission if email fails
        }

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
