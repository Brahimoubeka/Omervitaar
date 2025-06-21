const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email transporter configuration using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Set in your .env file
        pass: process.env.EMAIL_PASS  // Set in your .env file
    }
});

// TODO: Store this secret in your .env for production!
const secret = process.env.JWT_SECRET;

console.log('JWT Secret:', process.env.JWT_SECRET);

// Store reset tokens temporarily (in production, use Redis or database)
const passwordResetTokens = new Map();

// User Registration Route
router.post('/register', async (req, res) => {
    const { name, email, gender, birth_date, phone, password } = req.body;

    if (!name || !email || !gender || !birth_date || !phone || !password) {
        return res.status(400).json({ error: 'رجاء املا جميع الخانات' });
    }

    try {
        // Check if the email already exists
        const { rows: existingUsers } = await db.query(
            'SELECT * FROM "Users" WHERE "email" = $1',
            [email]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'تم انشاء هذا الحساب من قبل , قم بتسجيل الدخول الان' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert the new user into the database
        const { rows } = await db.query(
            'INSERT INTO "Users" ("name", "email", "gender", "birth_date", "phone", "password_hash") VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id"',
            [name, email, gender, birth_date, phone, hashedPassword]
        );
        res.json({ message: 'تم انشاء الحساب بنجاح..', userId: rows[0].id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا في الخادم' });
    }
});

// User Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'الرجاء ادخال البريد الالكتروني وكلمة السر' });
    }

    try {
        // Fetch the user from the database
        const { rows } = await db.query(
            'SELECT * FROM "Users" WHERE "email" = $1',
            [email]
        );
        const user = rows[0];
        if (!user) {
            return res.status(400).json({ error: 'لم يتم العثور على المستخدم!' });
        }

        // Compare the provided password with the stored hash
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(400).json({ error: 'كلمة المرور خاطئة' });
        }

        // Generate a JWT token that expires in 1 hour
        const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '1h' });

        res.json({ message: 'مرحبا!', token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم ' });
    }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if user exists
        const { rows } = await db.query('SELECT * FROM "Users" WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'لم يتم العثور على مستخدم بهذا البريد الإلكتروني.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiryTime = Date.now() + 3600000; // Token expires in 1 hour
        passwordResetTokens.set(resetToken, { email, expiry: expiryTime });

        // Create reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

        // Send email
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'إعادة تعيين كلمة المرور - Omervita',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #715100;">إعادة تعيين كلمة المرور</h2>
                    <p>لقد تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بك. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني.</p>
                    <p>لإعادة تعيين كلمة المرور الخاصة بك، انقر على الرابط أدناه:</p>
                    <a href="${resetUrl}" style="display: inline-block; background-color: #ffbf00; color: #2c2c2c; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">إعادة تعيين كلمة المرور</a>
                    <p>ينتهي هذا الرابط بعد ساعة واحدة.</p>
                    <p>مع تحيات،<br>فريق Omervita</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' });

    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء معالجة طلبك.' });
    }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Verify token
        const resetData = passwordResetTokens.get(token);
        if (!resetData || Date.now() > resetData.expiry) {
            return res.status(400).json({ error: 'رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.' });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        await db.query(
            'UPDATE "Users" SET password_hash = $1 WHERE email = $2',
            [hashedPassword, resetData.email]
        );

        // Remove used token
        passwordResetTokens.delete(token);

        res.json({ message: 'تم تحديث كلمة المرور بنجاح.' });

    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور.' });
    }
});

module.exports = router;
