const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { sendOrderEmail } = require('../utils/email');

// POST /api/guest-orders - Create a new order without requiring login
router.post('/guest-orders', async (req, res) => {
    const {
        shippingName, shippingAddress, city, province, street,
        department, postalCode, firstName, lastName, items,
        cartTotal, deliveryCost, finalTotal
    } = req.body;

    const orderDate = new Date().toISOString();

    // Only require: shippingName (phone), city, province, firstName, lastName
    if (!shippingName || !items || !items.length || !city || !province || !firstName || !lastName || cartTotal === undefined || deliveryCost === undefined || finalTotal === undefined) {
        console.log('Validation failed!');
        console.log('Missing:', {
            shippingName: !shippingName,
            items: !items || !items.length,
            city: !city,
            province: !province,
            firstName: !firstName,
            lastName: !lastName,
            cartTotal: cartTotal === undefined,
            deliveryCost: deliveryCost === undefined,
            finalTotal: finalTotal === undefined
        });
        return res.status(400).json({ error: 'الرجاء ملء جميع الحقول الإلزامية: الاسم، اللقب، رقم الهاتف، الولاية، المنطقة.' });
    }

    // Generate a unique order group identifier
    const orderGroup = Date.now().toString();

    try {
        for (const item of items) {
            // Fetch current stock
            const { data: product, error: stockError } = await supabase
                .from('Products')
                .select('stock')
                .eq('id', item.id)
                .single();

            if (stockError) throw stockError;

            if (!product || product.stock < item.quantity) {
                return res.status(400).json({ error: `Yeterli stok yok: ${item.name}` });
            }

            const newStock = product.stock - item.quantity;

            // Update product stock
            await supabase.from('Products').update({ stock: newStock }).eq('id', item.id);

            // Insert the order record
            const { error: orderError } = await supabase
                .from('Orders')
                .insert([{
                    user_id: null, // Guest order
                    product_id: item.id,
                    quantity: item.quantity,
                    shipping_name: shippingName,
                    shipping_address: shippingAddress,
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
                    delivery_price: deliveryCost,
                    total_price: finalTotal
                }]);

            if (orderError) throw orderError;
        }

        // Send order confirmation email to admin
        try {
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                let orderDetails = `<div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #715100; font-weight: bold;">طلب جديد من زائر - Omervita</h2>
                    <hr style='border:1px solid #ffbf00;'>
                    <p><b style='color:#715100;'>رقم الهاتف:</b> ${shippingName}</p>
                    <p><b style='color:#715100;'>العنوان:</b> ${shippingAddress || ''}, ${city}, ${province}, ${street || ''}, ${department || ''}, ${postalCode || ''}</p>
                    <p><b style='color:#715100;'>الاسم الكامل:</b> ${firstName} ${lastName}</p>
                    <p><b style='color:#715100;'>تاريخ الطلب:</b> ${orderDate}</p>
                    <ul style='color:#2c2c2c;'>`;

                for (const item of items) {
                    orderDetails += `<li><b>${item.name}</b> x <b>${item.quantity}</b></li>`;
                }

                orderDetails += `</ul>
                    <p><b style='color:#715100;'>مجموع المنتج:</b> <span style='color:#ffbf00;'>${cartTotal} دج</span></p>
                    <p><b style='color:#715100;'>التوصيل:</b> <span style='color:#ffbf00;'>${deliveryCost} دج</span></p>
                    <p><b style='color:#715100;'>مجموع الطلبية:</b> <span style='color:#ffbf00;'>${finalTotal} دج</span></p>
                    <hr style='border:1px solid #ffbf00;'>
                    <p style='color:#888; font-size:0.95em;'>هذا الطلب من زائر (بدون حساب)</p>
                </div>`;

                await sendOrderEmail(
                    adminEmail,
                    'طلب جديد من زائر - Omervita',
                    orderDetails
                );
            }
        } catch (emailErr) {
            console.error('فشل إرسال البريد الإلكتروني:', emailErr);
            // Don't throw error, continue with order creation
        }

        res.json({ message: 'تم استلام طلبك بنجاح!' });
    } catch (err) {
        console.error('خطأ في معالجة الطلب:', err);
        res.status(500).json({ error: 'خطأ في معالجة الطلب.' });
    }
});

module.exports = router;
