const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const supabase = require('../supabase');
const jwt = require('jsonwebtoken');
const { sendOrderEmail } = require('../utils/email');
const OrderService = require('../services/order-service');
const { 
    orderLimiter, 
    sanitizeInputs, 
    validateCSRFToken,
    sizeLimit
} = require('../middleware/security');
const validateOrderInputs = require('../middleware/validate-order-inputs');

const secret = process.env.JWT_SECRET;

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'الرجاء تسجيل الدخول او انشاء حساب أولا' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'الرجاء تسجيل الدخول او انشاء حساب أولا' });
    }
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Kimlik doğrulama başarısız.' });
        }
        req.user = decoded;
        next();
    });
}

// GET /api/orders - Retrieve orders for the logged-in user
router.get('/orders', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const { data, error } = await supabase
            .from('Orders')
            .select('id, order_group, product_id, quantity, order_date, status, products_price, delivery_price, total_price, Products(name, price)') // join Products
            .eq('user_id', userId)
            .or('archive_status_user.is.null,archive_status_user.neq.archived')
            .order('order_date', { ascending: false });
        if (error) throw error;
        // Map productName and price, and rename id to orderId
        const rows = (data || []).map(o => ({
            orderId: o.id,
            order_group: o.order_group,
            product_id: o.product_id,
            quantity: o.quantity,
            order_date: o.order_date,
            status: o.status,
            products_price: o.products_price,
            delivery_price: o.delivery_price,
            total_price: o.total_price,
            productName: o.Products?.name,
            price: o.Products?.price
        }));
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
    try {
        const { data, error } = await supabase
            .from('Orders')
            .select('order_group, id, quantity, order_date, status, shipping_name, shipping_address, city, province, street, department, postal_code, first_name, last_name, products_price, delivery_price, total_price, Users(name, email), Products(name, price)')
            .or('archive_status.is.null,archive_status.neq.archived')
            .order('order_group', { ascending: false })
            .order('order_date', { ascending: false });
        if (error) throw error;
        // Map userName, userEmail, productName, price, and rename id to orderId
        const rows = (data || []).map(o => ({
            order_group: o.order_group,
            orderId: o.id,
            quantity: o.quantity,
            order_date: o.order_date,
            status: o.status,
            shipping_name: o.shipping_name,
            shipping_address: o.shipping_address,
            city: o.city,
            province: o.province,
            street: o.street,
            department: o.department,
            postal_code: o.postal_code,
            first_name: o.first_name,
            last_name: o.last_name,
            products_price: o.products_price,
            delivery_price: o.delivery_price,
            total_price: o.total_price,
            userName: o.Users?.name,
            userEmail: o.Users?.email,
            productName: o.Products?.name,
            price: o.Products?.price
        }));
        res.json(rows);
    } catch (err) {
        console.error('خطأ أثناء أخذ الطلبيات!', err);
        res.status(500).json({ error: 'خطأ أثناء أخذ الطلبيات!' });
    }
});

// POST /api/orders - Create a new order
// POST /api/orders - Create a new authenticated user order
router.post('/orders', [
    verifyToken,
    orderLimiter,
    sizeLimit,
    sanitizeInputs,
    ...validateOrderInputs
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    const {
        shippingName, shippingAddress, city, firstName, lastName, 
        items, cartTotal, deliveryCost, finalTotal
    } = req.body;

    if (!shippingName || !items || !items.length || !city || !firstName || !lastName || 
        cartTotal === undefined || deliveryCost === undefined || finalTotal === undefined) {
        return res.status(400).json({ 
            error: 'الرجاء ملء جميع الحقول الإلزامية: الاسم، اللقب، رقم الهاتف، المنطقة.' 
        });
    }

    try {
        // Get user email from token
        const userId = req.user.userId;
        const { data: userData, error: userError } = await supabase
            .from('Users')
            .select('email')
            .eq('id', userId)
            .single();
            
        if (userError) throw userError;
        
        // Validate stock before processing
        await OrderService.validateStock(items);
        
        // Validate delivery cost
        await OrderService.validateDeliveryCost(city, deliveryCost);

        // Generate unique order reference
        const orderRef = Date.now().toString();

        // Create order with user ID
        const result = await OrderService.createUserOrder({
            userId,
            shippingName,
            shippingAddress,
            city,
            firstName,
            lastName,
            items,
            cartTotal,
            deliveryCost,
            finalTotal,
            orderRef
        });

        // Send order confirmation email
        try {
            let orderDetails = `<div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #715100; font-weight: bold;">تفاصيل الطلب من Omervita</h2>
                <p style="color: #333; font-size: 1.1em;"><b>نشكرك على ثقتك بمنتجاتنا</b></p>
                <hr style='border:1px solid #ffbf00;'>
                <p><b style='color:#715100;'>رقم الهاتف:</b> ${shippingName}</p>
                <p><b style='color:#715100;'>العنوان:</b> ${shippingAddress || ''}, ${city}</p>
                <p><b style='color:#715100;'>الاسم الكامل:</b> ${firstName} ${lastName}</p>
                <p><b style='color:#715100;'>تاريخ الطلب:</b> ${new Date().toLocaleDateString('ar-DZ')}</p>
                <p><b style='color:#715100;'>رقم الطلب:</b> #${orderRef}</p>
                <ul style='color:#2c2c2c;'>`;
            for (const item of items) {
                orderDetails += `<li><b>${item.name}</b> x <b>${item.quantity}</b></li>`;
            }
            orderDetails += `</ul>
                <p><b style='color:#715100;'>مجموع المنتج:</b> <span style='color:#ffbf00;'>${cartTotal} دج</span></p>
                <p><b style='color:#715100;'>التوصيل:</b> <span style='color:#ffbf00;'>${deliveryCost} دج</span></p>
                <p><b style='color:#715100;'>مجموع الطلبية:</b> <span style='color:#ffbf00;'>${finalTotal} دج</span></p>
                <hr style='border:1px solid #ffbf00;'>
                <p style='color:#888; font-size:0.95em;'>يمكنك متابعة طلبك من خلال صفحة <a href="${process.env.SITE_URL}/orders" style="color:#ffbf00;">الطلبات</a></p>
                <p style='color:#888; font-size:0.95em;'>فريق Omervita يتمنى لك يوماً سعيداً!</p>
            </div>`;

            // Send to customer
            if (userData.email) {
                await sendOrderEmail(
                    userData.email,
                    'تم استلام طلبك بنجاح - Omervita',
                    orderDetails
                );
            }

            // Send to admin
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                await sendOrderEmail(
                    adminEmail,
                    'طلبية جديدة - Omervita',
                    orderDetails
                );
            }
        } catch (emailErr) {
            console.error('Email Error:', emailErr);
            // Don't return error - email is not critical
        }

        res.json({
            success: true,
            message: 'تم استلام طلبك بنجاح',
            orderId: result.order_id,
            orderRef: result.order_ref
        });

    } catch (err) {
        console.error('خطأ في معالجة الطلب:', err);
        res.status(500).json({ 
            success: false,
            error: err.message || 'حدث خطأ أثناء معالجة طلبك'
        });
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
        const { data, error } = await supabase
            .from('Orders')
            .select('status, product_id, quantity, order_group')
            .eq('id', orderId);
        if (error) throw error;
        if (!data[0]) {
            return res.status(500).json({ error: 'لم يتم العثور على الطلبية' });
        }
        const previousStatus = data[0].status;
        const productId = data[0].product_id;
        const quantity = data[0].quantity;
        const orderGroup = data[0].order_group;

        // Admin cannot change status if it was previously 'İptal' and is not 'İptal' again
        if (previousStatus === 'إلغاء' && status !== 'إلغاء') {
            return res.status(400).json({ error: 'لايمكن التراجع بعد الغاء الطلبية' });
        }

        if (status === 'إلغاء' && previousStatus !== 'إلغاء') {
            // Step 1: Return product to stock
            // Fetch current stock
            const { data: product, error: stockError } = await supabase
                .from('Products')
                .select('stock')
                .eq('id', productId)
                .single();
            if (stockError) throw stockError;
            if (!product) throw new Error('Product not found');
            const newStock = product.stock + quantity;
            await supabase.from('Products').update({ stock: newStock }).eq('id', productId);
            // Step 2: Update the individual order's status
            await supabase
                .from('Orders')
                .update({ status })
                .eq('id', orderId);
            // Step 3: Recalculate prices for the entire order group
            const { data: groupOrders, error: groupOrdersError } = await supabase
                .from('Orders')
                .select('id, quantity, status, Products(price)')
                .eq('order_group', orderGroup);
            if (groupOrdersError) throw groupOrdersError;
            let newProductsPrice = 0;
            let allItemsCancelled = true;
            for (const item of groupOrders) {
                if (item.status !== 'إلغاء') {
                    newProductsPrice += (item.quantity * (item.Products?.price || 0));
                    allItemsCancelled = false;
                }
            }
            let newDeliveryPrice = 0;
            if (!allItemsCancelled) {
                const { data: groupInfo, error: groupInfoError } = await supabase
                    .from('Orders')
                    .select('delivery_price')
                    .eq('order_group', orderGroup)
                    .limit(1);
                if (groupInfoError) throw groupInfoError;
                newDeliveryPrice = groupInfo[0]?.delivery_price || 0;
            }
            const newFinalTotal = newProductsPrice + newDeliveryPrice;
            // Step 4: Update prices for all orders in the group
            await supabase
                .from('Orders')
                .update({
                    products_price: newProductsPrice,
                    delivery_price: newDeliveryPrice,
                    total_price: newFinalTotal
                })
                .eq('order_group', orderGroup);
            res.json({ message: 'تم تحديث الطلبية!' });
        } else {
            // Other status changes
            await supabase
                .from('Orders')
                .update({ status })
                .eq('id', orderId);
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
        await supabase
            .from('Orders')
            .update({ archive_status: 'archived' })
            .eq('order_group', group);
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
        const { data: verifyOwnership, error: verifyError } = await supabase
            .from('Orders')
            .select('id')
            .eq('order_group', group)
            .eq('user_id', userId)
            .limit(1);
        if (verifyError) throw verifyError;
        if (!verifyOwnership || verifyOwnership.length === 0) {
            return res.status(403).json({ error: 'لا يمكنك أرشفة طلبات لا تملكها.' });
        }
        // Update archive status for the user's orders in this group
        await supabase
            .from('Orders')
            .update({ archive_status_user: 'archived' })
            .eq('order_group', group)
            .eq('user_id', userId);
        res.json({ message: 'تمت أرشفة مجموعة الطلبات بنجاح.' });
    } catch (err) {
        console.error('خطأ في أرشفة مجموعة الطلبات:', err);
        res.status(500).json({ error: 'فشلت عملية الأرشفة.' });
    }
});

module.exports = router;
