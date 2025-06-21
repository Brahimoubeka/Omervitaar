// Utility to send emails using Nodemailer
const nodemailer = require('nodemailer');

// Use the same transporter as in auth.js, but with env variables for security
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Set in your .env
        pass: process.env.EMAIL_PASS  // Set in your .env
    }
});

async function sendOrderEmail(to, subject, html) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
    };
    return transporter.sendMail(mailOptions);
}

module.exports = { sendOrderEmail };
