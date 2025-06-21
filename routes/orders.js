const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { sendOrderEmail } = require('../utils/email');

const secret = process.env.JWT_SECRET;

console.log('JWT Secret:', process.env.JWT_SECRET);

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Lütfen önce giriş yapınız.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Lütfen önce giriş yapınız.' });
    }
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Kimlik doğrulama başarısız.' });
        }
        req.user = decoded;
        next();
    });
}

// POST /api/orders - Create a new order
router.post('/orders', verifyToken, async (req, res) => {
    const {
        shippingName, shippingAddress, city, province, street,
        department, postalCode, firstName, lastName, items,
        cartTotal, deliveryCost, finalTotal
    } = req.body;
    const userId = req.user.userId;
    const orderDate = new Date().toISOString();

    // Fetch user email from DB
    let userEmail = null;
    try {
        const userResult = await db.query('SELECT email FROM "Users" WHERE id = $1', [userId]);
        if (userResult.rows[0]) {
            userEmail = userResult.rows[0].email;
        }
    } catch (emailErr) {
        console.error('Kullanıcı e-posta alınamadı:', emailErr);
    }

    if (!shippingName || !shippingAddress || !items || !items.length || !city || !province || !firstName || !lastName || cartTotal === undefined || deliveryCost === undefined || finalTotal === undefined) {
        return res.status(400).json({ error: 'Sipariş bilgileri eksik veya sepet boş.' });
    }

    // Generate a unique order group identifier
    const orderGroup = Date.now().toString();

    try {
        for (const item of items) {
            // First, update product stock
            const updateStockRes = await db.query(
                'UPDATE "Products" SET "stock" = "stock" - $1 WHERE "id" = $2 AND "stock" >= $1',
                [item.quantity, item.id]
            );
            if (updateStockRes.rowCount === 0) {
                return res.status(400).json({ error: `Yeterli stok yok: ${item.name}` });
            }

            // Insert the order record
            await db.query(
                `INSERT INTO "Orders" (
                    "user_id", "product_id", "quantity", "shipping_name", "shipping_address", "order_date",
                    "status", "order_group", "city", "province", "street", "department", "postal_code",
                    "first_name", "last_name", "products_price", "delivery_price", "total_price"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11, $12, $13,
                    $14, $15, $16, $17, $18
                )`,
                [
                    userId, item.id, item.quantity, shippingName, shippingAddress, orderDate,
                    'sipariş alındı', orderGroup, city, province, street, department, postalCode,
                    firstName, lastName, cartTotal, deliveryCost, finalTotal
                ]
            );
        }
        // Send order confirmation email
        try {
            const email = userEmail;
            if (!email) throw new Error('No recipient email found');
            let orderDetails = `<h2>تفاصيل الطلب من omervita</h2>`;
            orderDetails += `<p><b>رقم الهاتف:</b> ${shippingName}</p>`;
            orderDetails += `<p><b>العنوان:</b> ${shippingAddress}, ${city}, ${province}, ${street}, ${department}, ${postalCode}</p>`;
            orderDetails += `<p><b>الاسم الكامل:</b> ${firstName} ${lastName}</p>`;
            orderDetails += `<p><b>تاريخ الطلب:</b> ${orderDate}</p>`;
            orderDetails += `<ul>`;
            for (const item of items) {
                orderDetails += `<li>${item.name} x ${item.quantity}</li>`;
            }
            orderDetails += `</ul>`;
            orderDetails += `<p><b>مجموع المنتج:</b> ${cartTotal} TL</p>`;
            orderDetails += `<p><b>التوصيل:</b> ${deliveryCost} TL</p>`;
            orderDetails += `<p><b>مجموع الطلبية:</b> ${finalTotal} TL</p>`;
            await sendOrderEmail(
                email,
                'Siparişiniz Alındı',
                orderDetails
            );
        } catch (emailErr) {
            console.error('Sipariş e-postası gönderilemedi:', emailErr);
        }
        res.json({ message: 'Sipariş başarıyla alındı.' });
    } catch (err) {
        console.error('Sipariş işlenirken hata:', err);
        res.status(500).json({ error: 'Sipariş işlenirken hata oluştu.' });
    }
});

// GET /api/orders - Retrieve orders for the logged-in user
router.get('/orders', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const sql = `
        SELECT
            o."id" AS "orderId",
            o."order_group",
            o."product_id",
            o."quantity",
            o."order_date",
            o."status",
            o."products_price",
            o."delivery_price",
            o."total_price",
            p."name" AS "productName",
            p."price"
        FROM "Orders" o
        LEFT JOIN "Products" p ON o."product_id" = p."id"
        WHERE o."user_id" = $1 
        AND (o."archive_status_user" IS NULL OR o."archive_status_user" != 'archived')
        ORDER BY o."order_date" DESC
    `;
    try {
        const { rows } = await db.query(sql, [userId]);
        res.json(rows);
    } catch (err) {
        console.error("خطأ أثناء أخذ الطلبيات ", err);
        res.status(500).json({ error: "خطأ في الخادم!" });
    }
});

// GET /api/admin/orders - Retrieve all orders for the admin panel
router.get('/admin/orders', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yalnızca admin erişebilir.' });
    }
    const query = `
        SELECT 
            o."order_group",
            o."id" AS "orderId",
            o."quantity",
            o."order_date",
            o."status",
            o."shipping_name",
            o."shipping_address",
            o."city",
            o."province",
            o."street",
            o."department",
            o."postal_code",
            o."first_name",
            o."last_name",
            o."products_price",
            o."delivery_price",
            o."total_price",
            u."name" AS "userName",
            u."email" AS "userEmail",
            p."name" AS "productName",
            p."price"
        FROM "Orders" o
        JOIN "Users" u ON o."user_id" = u."id"
        JOIN "Products" p ON o."product_id" = p."id"
        WHERE o."archive_status" IS NULL OR o."archive_status" != 'archived'
        ORDER BY o."order_group" DESC, o."order_date" DESC
    `;
    try {
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('خطأ أثناء أخذ الطلبيات!', err);
        res.status(500).json({ error: 'خطأ أثناء أخذ الطلبيات!' });
    }
});

// PATCH /api/admin/orders/:orderId/status - Admin updates status of one product order
router.patch('/admin/orders/:orderId/status', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yalnızca admin erişebilir.' });
    }
    const orderId = req.params.orderId;
    const { status } = req.body;
    const validStatuses = ['إلغاء', 'تم التأكيد', 'قيد الشحن', 'تم التسليم'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'هناك خطأ' });
    }

    try {
        const { rows } = await db.query(
            'SELECT "status", "product_id", "quantity", "order_group" FROM "Orders" WHERE "id" = $1',
            [orderId]
        );
        if (!rows[0]) {
            return res.status(500).json({ error: 'لم يتم العثور على الطلبية' });
        }
        const previousStatus = rows[0].status;
        const productId = rows[0].product_id;
        const quantity = rows[0].quantity;
        const orderGroup = rows[0].order_group;

        // Admin cannot change status if it was previously 'İptal' and is not 'İptal' again
        if (previousStatus === 'إلغاء' && status !== 'إلغاء') {
            return res.status(400).json({ error: 'لايمكن التراجع بعد الغاء الطلبية' });
        }

        if (status === 'إلغاء' && previousStatus !== 'إلغاء') {
            // Step 1: Return product to stock
            await db.query('UPDATE "Products" SET "stock" = "stock" + $1 WHERE "id" = $2', [quantity, productId]);
            // Step 2: Update the individual order's status
            await db.query('UPDATE "Orders" SET "status" = $1 WHERE "id" = $2', [status, orderId]);
            // Step 3: Recalculate prices for the entire order group
            const groupOrdersResult = await db.query(`
                SELECT o."id" AS "orderId", o."quantity", o."status", p."price" AS "unitPrice"
                FROM "Orders" o
                JOIN "Products" p ON o."product_id" = p."id"
                WHERE o."order_group" = $1
            `, [orderGroup]);
            let newProductsPrice = 0;
            let allItemsCancelled = true;
            for (const item of groupOrdersResult.rows) {
                if (item.status !== 'إلغاء') {
                    newProductsPrice += (item.quantity * item.unitPrice);
                    allItemsCancelled = false;
                }
            }
            let newDeliveryPrice;
            const groupInfoResult = await db.query('SELECT "delivery_price" FROM "Orders" WHERE "order_group" = $1 LIMIT 1', [orderGroup]);
            if (allItemsCancelled) {
                newDeliveryPrice = 0;
            } else {
                newDeliveryPrice = groupInfoResult.rows[0] ? groupInfoResult.rows[0].delivery_price : 0;
            }
            const newFinalTotal = newProductsPrice + newDeliveryPrice;
            // Step 4: Update prices for all orders in the group
            await db.query(`
                UPDATE "Orders"
                SET "products_price" = $1, "delivery_price" = $2, "total_price" = $3
                WHERE "order_group" = $4
            `, [newProductsPrice, newDeliveryPrice, newFinalTotal, orderGroup]);
            res.json({ message: 'تم تحديث الطلبية!' });
        } else {
            // Other status changes
            await db.query('UPDATE "Orders" SET "status" = $1 WHERE "id" = $2', [status, orderId]);
            res.json({ message: 'تم تحديث الحالة بنجاح' });
        }
    } catch (err) {
        console.error('Sipariş güncellenirken hata:', err);
        res.status(500).json({ error: 'خطأ أثناء تحديث الطلبية!' });
    }
});

// PATCH /api/admin/orders/group/:orderGroup/archive - Admin archives a full group
router.patch('/admin/orders/group/:orderGroup/archive', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yalnızca admin erişebilir.' });
    }
    const group = req.params.orderGroup;
    try {
        await db.query(`UPDATE "Orders" SET "archive_status" = 'archived' WHERE "order_group" = $1`, [group]);
        res.json({ message: 'Sipariş grubu arşivlendi.' });
    } catch (err) {
        console.error('خطأ عند محاولة الارشفة', err);
        res.status(500).json({ error: 'لم تتم عملية الأرشفة' });
    }
});

// PATCH /api/orders/group/:orderGroup/archive - User archives their order group
router.patch('/orders/group/:orderGroup/archive', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    const group = req.params.orderGroup;
    
    try {
        // First verify that the order group belongs to the user
        const verifyOwnership = await db.query(
            'SELECT 1 FROM "Orders" WHERE "order_group" = $1 AND "user_id" = $2 LIMIT 1',
            [group, userId]
        );

        if (verifyOwnership.rowCount === 0) {
            return res.status(403).json({ error: 'لا يمكنك أرشفة طلبات لا تملكها.' });
        }

        // Update archive status for the user's orders in this group
        await db.query(`
            UPDATE "Orders" 
            SET "archive_status_user" = 'archived' 
            WHERE "order_group" = $1 AND "user_id" = $2
        `, [group, userId]);

        res.json({ message: 'تمت أرشفة مجموعة الطلبات بنجاح.' });
    } catch (err) {
        console.error('خطأ في أرشفة مجموعة الطلبات:', err);
        res.status(500).json({ error: 'فشلت عملية الأرشفة.' });
    }
});

module.exports = router;
