const express = require('express');
const router = express.Router();
const db = require('../db');
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
        const { rows } = await db.query(`
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                COUNT(v.id) AS total_visits,
                COUNT(CASE WHEN v.visited_at > NOW() - INTERVAL '7 days' THEN 1 END) AS visits_last_7_days,
                COUNT(CASE WHEN v.visited_at > NOW() - INTERVAL '30 days' THEN 1 END) AS visits_last_30_days
            FROM "Products" p
            LEFT JOIN "ProductVisits" v ON p.id = v.product_id
            GROUP BY p.id
            ORDER BY total_visits DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching analytics:", err);
        res.status(500).json({ error: "لم يتم أخذ البيانات" });
    }
});

// --- Product sales (most sold to least sold) ---
router.get('/admin/analytics/product-sales', verifyAdmin, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                COALESCE(SUM(CASE WHEN o.status != 'إلغاء' THEN o.quantity ELSE 0 END), 0) AS total_sold,
                COALESCE(COUNT(CASE WHEN o.status != 'إلغاء' THEN 1 END), 0) AS successful_orders,
                COALESCE(COUNT(CASE WHEN o.status = 'إلغاء' THEN 1 END), 0) AS canceled_orders,
                COALESCE(SUM(CASE WHEN o.status != 'إلغاء' THEN o.total_price ELSE 0 END), 0) AS total_revenue
            FROM "Products" p
            LEFT JOIN "Orders" o ON p.id = o.product_id
            GROUP BY p.id
            ORDER BY total_sold DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching product sales:", err);
        res.status(500).json({ error: " لم يتم أخذ البيانات" });
    }
});

// --- User purchases (total per user) ---
router.get('/admin/analytics/user-purchases', verifyAdmin, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                u.id AS user_id,
                u.name AS user_name,
                u.email,
                COALESCE(COUNT(o.id), 0) AS total_orders,
                COALESCE(SUM(o.total_price), 0) AS total_spent
            FROM "Users" u
            LEFT JOIN "Orders" o ON u.id = o.user_id
            GROUP BY u.id
            ORDER BY total_spent DESC
        `);
        res.json(rows);
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
        // Get total count first
        const countResult = await db.query('SELECT COUNT(DISTINCT p.id) FROM "Products" p');
        const totalCount = parseInt(countResult.rows[0].count);

        // Get paginated data
        const { rows } = await db.query(`
            SELECT 
                p.id AS product_id,
                p.name AS product_name,
                COUNT(v.id) AS total_visits,
                COUNT(CASE WHEN v.visited_at > NOW() - INTERVAL '7 days' THEN 1 END) AS visits_last_7_days,
                COUNT(CASE WHEN v.visited_at > NOW() - INTERVAL '30 days' THEN 1 END) AS visits_last_30_days
            FROM "Products" p
            LEFT JOIN "ProductVisits" v ON p.id = v.product_id
            GROUP BY p.id
            ORDER BY total_visits DESC
            LIMIT $1 OFFSET $2
        `, [limit, start]);

        res.json({
            items: rows,
            hasMore: start + limit < totalCount,
            total: totalCount
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
        // Get total count first
        const countResult = await db.query('SELECT COUNT(DISTINCT p.id) FROM "Products" p');
        const totalCount = parseInt(countResult.rows[0].count);

        // Get paginated data
        const { rows } = await db.query(`
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                COALESCE(SUM(CASE WHEN o.status != 'إلغاء' THEN o.quantity ELSE 0 END), 0) AS total_sold,
                COALESCE(COUNT(CASE WHEN o.status != 'إلغاء' THEN 1 END), 0) AS successful_orders,
                COALESCE(COUNT(CASE WHEN o.status = 'إلغاء' THEN 1 END), 0) AS canceled_orders,
                COALESCE(SUM(CASE WHEN o.status != 'إلغاء' THEN o.total_price ELSE 0 END), 0) AS total_revenue
            FROM "Products" p
            LEFT JOIN "Orders" o ON p.id = o.product_id
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT $1 OFFSET $2
        `, [limit, start]);

        res.json({
            items: rows,
            hasMore: start + limit < totalCount,
            total: totalCount
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
        // Get total count first
        const countResult = await db.query('SELECT COUNT(DISTINCT u.id) FROM "Users" u');
        const totalCount = parseInt(countResult.rows[0].count);

        // Get paginated data
        const { rows } = await db.query(`
            SELECT
                u.id AS user_id,
                u.name AS user_name,
                u.email,
                COALESCE(COUNT(o.id), 0) AS total_orders,
                COALESCE(SUM(CASE WHEN o.status != 'إلغاء' THEN o.total_price ELSE 0 END), 0) AS total_spent
            FROM "Users" u
            LEFT JOIN "Orders" o ON u.id = o.user_id
            GROUP BY u.id
            ORDER BY total_spent DESC
            LIMIT $1 OFFSET $2
        `, [limit, start]);

        res.json({
            items: rows,
            hasMore: start + limit < totalCount,
            total: totalCount
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
