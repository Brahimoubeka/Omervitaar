// Utility to send emails using Nodemailer
const nodemailer = require('nodemailer');

// Use the same transporter as in auth.js, but with env variables for security
// Added strict timeouts so unreachable SMTP servers on cloud hosts never hang requests
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Set in your .env
        pass: process.env.EMAIL_PASS  // Set in your .env
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000
});

async function sendOrderEmail(to, subject, html) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !to) {
        return null;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
    };
    return transporter.sendMail(mailOptions);
}

module.exports = { sendOrderEmail };
