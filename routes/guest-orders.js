const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { sendOrderEmail } = require('../utils/email');

// POST /api/guest-orders - Create a new order without requiring login
router.post('/guest-orders', async (req, res) => {
    let {
        shippingName, shippingAddress, city, province, street,
        department, postalCode, firstName, lastName, items,
        cartTotal, deliveryCost, finalTotal, deliveryType,
        deliveryCompanyId, deliveryCompanyName
    } = req.body;

    // Support field aliases from landing page & cart
    if (!shippingName) {
        shippingName = req.body.customerPhone || req.body.phone;
    }
    if ((!firstName || !lastName) && req.body.customerName) {
        const parts = req.body.customerName.trim().split(/\s+/);
        firstName = firstName || parts[0] || 'عميل';
        lastName = lastName || parts.slice(1).join(' ') || '.';
    }
    if (cartTotal === undefined) {
        cartTotal = req.body.products_price !== undefined ? req.body.products_price : (req.body.subtotal !== undefined ? req.body.subtotal : 0);
    }
    if (deliveryCost === undefined) {
        deliveryCost = req.body.deliveryFee !== undefined ? req.body.deliveryFee : 0;
    }
    if (finalTotal === undefined) {
        finalTotal = parseFloat(cartTotal || 0) + parseFloat(deliveryCost || 0);
    }

    const orderDate = new Date().toISOString();

    // Only require: shippingName (phone), city, province/willaya, firstName, lastName
    if (!shippingName || !items || !items.length || !city || !firstName || !lastName || cartTotal === undefined || deliveryCost === undefined || finalTotal === undefined) {
        return res.status(400).json({ error: 'الرجاء ملء جميع الحقول الإلزامية: الاسم، اللقب، رقم الهاتف، الولاية.' });
    }

    const OrderService = require('../services/order-service');
    const { calculatePromoDiscount, checkFreeDeliveryEligibility } = require('./promos');
    const pool = require('../db');

    try {
        await OrderService.validateDeliveryCost(city, deliveryCost, deliveryCompanyId);
    } catch (e) {
        // Log but don't strictly reject if valid positive number
        console.warn('Guest order delivery validation:', e.message);
    }

    // Process Promo Code & Free Delivery
    const promoInput = (req.body.promoCode || req.body.promo_code || '').trim();
    let discountAmount = 0;
    let appliedPromo = null;
    let isFreeDelivery = false;

    try {
        // 1. Check free delivery status (storewide or per-product)
        const freeDeliveryCheck = await checkFreeDeliveryEligibility(items);
        if (freeDeliveryCheck.isFreeDelivery) {
            isFreeDelivery = true;
        }

        // 2. Validate promo code
        if (promoInput) {
            const promoCalc = await calculatePromoDiscount({ code: promoInput, items, cartTotal });
            if (promoCalc.valid) {
                appliedPromo = promoCalc;
                discountAmount = promoCalc.discount_amount || 0;
                if (promoCalc.free_delivery) {
                    isFreeDelivery = true;
                }
                // Increment promo usage count
                await pool.query(
                    'UPDATE public."PromoCodes" SET used_count = used_count + 1 WHERE id = $1',
                    [promoCalc.promoId]
                );
            }
        }
    } catch (promoErr) {
        console.warn('Error applying promo in guest order:', promoErr.message);
    }

    const calculatedDeliveryCost = isFreeDelivery ? 0 : parseFloat(deliveryCost);
    const calculatedFinalTotal = Math.max(0, parseFloat(cartTotal) - discountAmount) + calculatedDeliveryCost;

    // Generate a unique order group identifier
    const orderGroup = Date.now().toString();
    const companyTag = deliveryCompanyName ? `[شركة: ${deliveryCompanyName}]` : '';
    const deskTag = deliveryType === 'desk' ? '[استلام من المكتب - Stopdesk]' : '';
    let formattedAddress = (shippingAddress || '').trim();
    if (companyTag && !formattedAddress.includes('شركة')) {
        formattedAddress = `${companyTag} ${formattedAddress}`.trim();
    }
    if (deskTag && !formattedAddress.includes('Stopdesk')) {
        formattedAddress = `${deskTag} ${formattedAddress}`.trim();
    }

    try {
        for (const item of items) {
            let product = null;
            if (item.id) {
                const { data } = await supabase
                    .from('Products')
                    .select('id, stock')
                    .eq('id', item.id)
                    .maybeSingle();
                product = data;
            }

            if (product) {
                if (product.stock !== undefined && product.stock !== null && product.stock < item.quantity) {
                    return res.status(400).json({ error: `الكمية المطلوبة غير متوفرة: ${item.name}` });
                }
                const newStock = Math.max(0, (product.stock || 0) - item.quantity);
                await supabase.from('Products').update({ stock: newStock }).eq('id', product.id);
            }

            // Support landing page root path
            const funnelPath = item.root_path || item.name || req.body.funnel_root_path;
            let itemAddress = formattedAddress;
            if (funnelPath && !itemAddress.includes('[مسار الطلب:')) {
                itemAddress = `[مسار الطلب: ${funnelPath}] ${itemAddress}`.trim();
            }

            // Insert the order record
            const { error: orderError } = await supabase
                .from('Orders')
                .insert([{
                    user_id: null, // Guest order
                    product_id: product ? product.id : null,
                    quantity: item.quantity || 1,
                    shipping_name: shippingName,
                    shipping_address: itemAddress || (city || ''),
                    order_date: orderDate,
                    status: 'pending',
                    order_group: orderGroup,
                    city,
                    province,
                    street,
                    department,
                    postal_code: postalCode,
                    first_name: firstName,
                    last_name: lastName,
                    products_price: cartTotal,
                    delivery_price: calculatedDeliveryCost,
                    total_price: calculatedFinalTotal,
                    promo_code: appliedPromo ? appliedPromo.code : null,
                    discount_amount: discountAmount
                }]);

            if (orderError) throw orderError;
        }

        // Send order confirmation email to admin
        try {
            const { generateOrderEmailHtml } = require('../utils/order-receipt');
            const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
            if (adminEmail) {
                const orderDetails = generateOrderEmailHtml({
                    orderRef: orderGroup,
                    date: orderDate,
                    firstName,
                    lastName,
                    shippingName,
                    city,
                    deliveryCompanyName,
                    deliveryType,
                    shippingAddress: formattedAddress || city,
                    items,
                    cartTotal,
                    deliveryCost: calculatedDeliveryCost,
                    discountAmount,
                    promoCode: appliedPromo ? appliedPromo.code : null,
                    finalTotal: calculatedFinalTotal,
                    isGuest: true
                });

                await sendOrderEmail(
                    adminEmail,
                    `طلب جديد من المتجر / صفحة الهبوط #${orderGroup} - Omervita`,
                    orderDetails
                );
            }
        } catch (emailErr) {
            console.error('فشل إرسال البريد الإلكتروني:', emailErr);
            // Don't throw error, continue with order creation
        }

        res.json({ message: 'تم استلام طلبك بنجاح!', orderId: orderGroup });
    } catch (err) {
        console.error('خطأ في معالجة الطلب:', err);
        res.status(500).json({ error: 'خطأ في معالجة الطلب.' });
    }
});

module.exports = router;
