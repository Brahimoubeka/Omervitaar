const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

console.log('JWT Secret:', secret);

// --- Admin verification middleware ---
function verifyAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Token bulunamadı.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token bulunamadı.' });
    }
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token doğrulanamadı.' });
        }
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Yönetici erişimi gerekli.' });
        }
        req.user = decoded;
        next();
    });
}

// --- Visits per product (total, last 30 days, grouped by day) ---
router.get('/admin/analytics/product-visits', verifyAdmin, async (req, res) => {
    try {
        // Supabase does not support SQL aggregation in the same way, so fetch and aggregate in JS
        const { data: products, error: prodError } = await supabase.from('Products').select('id, name');
        if (prodError) throw prodError;
        const { data: visits, error: visitError } = await supabase.from('ProductVisits').select('id, product_id, visited_at');
        if (visitError) throw visitError;
        const now = new Date();
        const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
        const result = products.map(p => {
            const prodVisits = visits.filter(v => v.product_id === p.id);
            return {
                product_id: p.id,
                product_name: p.name,
                total_visits: prodVisits.length,
                visits_last_7_days: prodVisits.filter(v => new Date(v.visited_at) > daysAgo(7)).length,
                visits_last_30_days: prodVisits.filter(v => new Date(v.visited_at) > daysAgo(30)).length
            };
        }).sort((a, b) => b.total_visits - a.total_visits);
        res.json(result);
    } catch (err) {
        console.error("Error fetching analytics:", err);
        res.status(500).json({ error: "لم يتم أخذ البيانات" });
    }
});

// --- Product sales (most sold to least sold) ---
router.get('/admin/analytics/product-sales', verifyAdmin, async (req, res) => {
    try {
        const { data: products, error: prodError } = await supabase.from('Products').select('id, name');
        if (prodError) throw prodError;
        const { data: orders, error: orderError } = await supabase.from('Orders').select('product_id, quantity, status, total_price');
        if (orderError) throw orderError;
        const result = products.map(p => {
            const prodOrders = orders.filter(o => o.product_id === p.id);
            const successful = prodOrders.filter(o => o.status !== 'إلغاء');
            const canceled = prodOrders.filter(o => o.status === 'إلغاء');
            return {
                product_id: p.id,
                product_name: p.name,
                total_sold: successful.reduce((sum, o) => sum + (o.quantity || 0), 0),
                successful_orders: successful.length,
                canceled_orders: canceled.length,
                total_revenue: successful.reduce((sum, o) => sum + (o.total_price || 0), 0)
            };
        }).sort((a, b) => b.total_sold - a.total_sold);
        res.json(result);
    } catch (err) {
        console.error("Error fetching product sales:", err);
        res.status(500).json({ error: " لم يتم أخذ البيانات" });
    }
});

// --- User purchases (total per user) ---
router.get('/admin/analytics/user-purchases', verifyAdmin, async (req, res) => {
    try {
        const { data: users, error: userError } = await supabase.from('Users').select('id, name, email');
        if (userError) throw userError;
        const { data: orders, error: orderError } = await supabase.from('Orders').select('user_id, total_price');
        if (orderError) throw orderError;
        const result = users.map(u => {
            const userOrders = orders.filter(o => o.user_id === u.id);
            return {
                user_id: u.id,
                user_name: u.name,
                email: u.email,
                total_orders: userOrders.length,
                total_spent: userOrders.reduce((sum, o) => sum + (o.total_price || 0), 0)
            };
        }).sort((a, b) => b.total_spent - a.total_spent);
        res.json(result);
    } catch (err) {
        console.error("Error fetching user analytics:", err);
        res.status(500).json({ error: "لم يتم أخذ البيانات" });
    }
});

// --- Visits per product with pagination ---
router.get('/admin/analytics/visits', verifyAdmin, async (req, res) => {
    const start = parseInt(req.query.start) || 0;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const { data: products, error: prodError } = await supabase.from('Products').select('id, name');
        if (prodError) throw prodError;
        const { data: visits, error: visitError } = await supabase.from('ProductVisits').select('id, product_id, visited_at');
        if (visitError) throw visitError;
        const now = new Date();
        const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
        const all = products.map(p => {
            const prodVisits = visits.filter(v => v.product_id === p.id);
            return {
                product_id: p.id,
                product_name: p.name,
                total_visits: prodVisits.length,
                visits_last_7_days: prodVisits.filter(v => new Date(v.visited_at) > daysAgo(7)).length,
                visits_last_30_days: prodVisits.filter(v => new Date(v.visited_at) > daysAgo(30)).length
            };
        }).sort((a, b) => b.total_visits - a.total_visits);
        const items = all.slice(start, start + limit);
        res.json({
            items,
            hasMore: start + limit < all.length,
            total: all.length
        });
    } catch (err) {
        console.error("Error fetching analytics:", err);
        res.status(500).json({ error: "خطأ في استرجاع البيانات" });
    }
});

// --- Product sales with pagination ---
router.get('/admin/analytics/sales', verifyAdmin, async (req, res) => {
    const start = parseInt(req.query.start) || 0;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const { data: products, error: prodError } = await supabase.from('Products').select('id, name');
        if (prodError) throw prodError;
        const { data: orders, error: orderError } = await supabase.from('Orders').select('product_id, quantity, status, total_price');
        if (orderError) throw orderError;
        const all = products.map(p => {
            const prodOrders = orders.filter(o => o.product_id === p.id);
            const successful = prodOrders.filter(o => o.status !== 'إلغاء');
            const canceled = prodOrders.filter(o => o.status === 'إلغاء');
            return {
                product_id: p.id,
                product_name: p.name,
                total_sold: successful.reduce((sum, o) => sum + (o.quantity || 0), 0),
                successful_orders: successful.length,
                canceled_orders: canceled.length,
                total_revenue: successful.reduce((sum, o) => sum + (o.total_price || 0), 0)
            };
        }).sort((a, b) => b.total_sold - a.total_sold);
        const items = all.slice(start, start + limit);
        res.json({
            items,
            hasMore: start + limit < all.length,
            total: all.length
        });
    } catch (err) {
        console.error("Error fetching product sales:", err);
        res.status(500).json({ error: "خطأ في استرجاع البيانات" });
    }
});

// --- User purchases with pagination ---
router.get('/admin/analytics/users', verifyAdmin, async (req, res) => {
    const start = parseInt(req.query.start) || 0;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const { data: users, error: userError } = await supabase.from('Users').select('id, name, email');
        if (userError) throw userError;
        const { data: orders, error: orderError } = await supabase.from('Orders').select('user_id, total_price, status');
        if (orderError) throw orderError;
        const all = users.map(u => {
            const userOrders = orders.filter(o => o.user_id === u.id && o.status !== 'إلغاء');
            return {
                user_id: u.id,
                user_name: u.name,
                email: u.email,
                total_orders: userOrders.length,
                total_spent: userOrders.reduce((sum, o) => sum + (o.total_price || 0), 0)
            };
        }).sort((a, b) => b.total_spent - a.total_spent);
        const items = all.slice(start, start + limit);
        res.json({
            items,
            hasMore: start + limit < all.length,
            total: all.length
        });
    } catch (err) {
        console.error("Error fetching user analytics:", err);
        res.status(500).json({ error: "خطأ في استرجاع البيانات" });
    }
});

// --- Get current user info from token ---
router.get('/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Token bulunamadı.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token bulunamadı.' });
    }
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token doğrulanamadı.' });
        }
        res.json(decoded);
    });
});

module.exports = router;
