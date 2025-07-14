const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
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

// In-memory store for failed login attempts (per IP)
const failedLoginAttempts = new Map();

// User Registration Route
router.post('/register', async (req, res) => {
    const { name, email, password, gender, birth_date, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'رجاء املا جميع الخانات المطلوبة' });
    }

    try {
        // Check if the email already exists
        const { data: existingUsers, error: existError } = await supabase
            .from('Users')
            .select('*')
            .eq('email', email);
        if (existError) throw existError;
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'تم انشاء هذا الحساب من قبل , قم بتسجيل الدخول الان' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert the new user into the database
        const { data, error } = await supabase
            .from('Users')
            .insert([{ 
                name, 
                email, 
                password_hash: hashedPassword,
                gender: gender || null,
                birth_date: birth_date || null,
                phone: phone || null
            }])
            .select('id');
        if (error) throw error;
        res.json({ message: 'تم انشاء الحساب بنجاح..', userId: data[0].id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطا في الخادم' });
    }
});

// User Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip;
    const now = Date.now();
    let attempts = failedLoginAttempts.get(ip) || { count: 0, last: 0, blockedUntil: 0 };

    // Check if blocked
    if (attempts.blockedUntil && now < attempts.blockedUntil) {
        return res.status(429).json({ error: 'تم حظر تسجيل الدخول من هذا الجهاز لمدة ساعة بسبب محاولات متكررة. يرجى المحاولة لاحقًا.' });
    }

    if (!email || !password) {
        return res.status(400).json({ error: 'الرجاء ادخال البريد الالكتروني وكلمة السر' });
    }

    try {
        // Fetch the user from the database
        const { data: rows, error: userError } = await supabase
            .from('Users')
            .select('*')
            .eq('email', email);
        if (userError) throw userError;
        const user = rows[0];
        if (!user) {
            attempts.count++;
            attempts.last = now;
            if (attempts.count >= 10) {
                attempts.blockedUntil = now + 60 * 60 * 1000; // 1 hour
            }
            failedLoginAttempts.set(ip, attempts);
            let msg = 'لم يتم العثور على المستخدم!';
            if (attempts.count >= 3 && attempts.count < 10) {
                msg += ' حاول استرجاع كلمة المرور.';
            } else if (attempts.count >= 10) {
                msg = 'تم حظر تسجيل الدخول من هذا الجهاز لمدة ساعة بسبب محاولات متكررة. يرجى المحاولة لاحقًا.';
            }
            return res.status(400).json({ error: msg });
        }

        // Compare the provided password with the stored hash
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            attempts.count++;
            attempts.last = now;
            if (attempts.count >= 10) {
                attempts.blockedUntil = now + 60 * 60 * 1000; // 1 hour
            }
            failedLoginAttempts.set(ip, attempts);
            let msg = 'كلمة المرور خاطئة';
            if (attempts.count >= 3 && attempts.count < 10) {
                msg += 'يمكنك اعادة تعيين كلمة مرور جديدة';
            } else if (attempts.count >= 10) {
                msg = 'تم حظر تسجيل الدخول من هذا الجهاز لمدة ساعة بسبب محاولات متكررة. يرجى المحاولة لاحقًا.';
            }
            return res.status(400).json({ error: msg });
        }

        // Successful login: reset attempts
        failedLoginAttempts.delete(ip);

        // Generate a JWT token that expires in 1 hour
        const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '1h' });

        // Set the token as a secure HTTP-only cookie for admin access
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only set secure in production
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour in milliseconds
        });

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
        const { data: rows, error: userError } = await supabase
            .from('Users')
            .select('*')
            .eq('email', email);
        if (userError) throw userError;
        if (!rows || rows.length === 0) {
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

    // Password strength validation (same as registration)
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordPattern.test(newPassword)) {
        return res.status(400).json({ error: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل، وتحتوي على حرف كبير واحد على الأقل، ورقم واحد، ورمز واحد.' });
    }

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
        const { error } = await supabase
            .from('Users')
            .update({ password_hash: hashedPassword })
            .eq('email', resetData.email);
        if (error) throw error;

        // Remove used token
        passwordResetTokens.delete(token);

        res.json({ message: 'تم تحديث كلمة المرور بنجاح.' });

    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور.' });
    }
});

// Logout Route
router.post('/logout', (req, res) => {
    // Clear the JWT cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

module.exports = router;
