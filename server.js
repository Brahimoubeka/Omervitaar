const express = require('express');
const path = require('path');
const app = express();
const db = require('./db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const productRoutes = require('./routes/products');
app.use('/api', productRoutes);

const ordersRoutes = require('./routes/orders');
app.use('/api', ordersRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api', adminRoutes);

const messagesRoutes = require('./routes/messages');
app.use('/api', messagesRoutes);

const reviewsRoutes = require('./routes/reviews');
app.use('/api', reviewsRoutes);

const analyticsRoutes = require('./routes/analytics');
app.use('/api', analyticsRoutes);


// Define a  route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
