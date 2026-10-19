const supabase = require('../supabase');

class OrderService {
    static async createUserOrder({
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
        orderRef,
        promoCode
    }) {
        try {
            const { calculatePromoDiscount, checkFreeDeliveryEligibility } = require('../routes/promos');
            const pool = require('../db');

            let discountAmount = 0;
            let appliedPromo = null;
            let isFreeDelivery = false;

            try {
                // 1. Check free delivery status
                const freeDeliveryCheck = await checkFreeDeliveryEligibility(items);
                if (freeDeliveryCheck.isFreeDelivery) {
                    isFreeDelivery = true;
                }

                // 2. Validate promo code
                const cleanPromo = (promoCode || '').trim();
                if (cleanPromo) {
                    const promoCalc = await calculatePromoDiscount({ code: cleanPromo, items, cartTotal });
                    if (promoCalc.valid) {
                        appliedPromo = promoCalc;
                        discountAmount = promoCalc.discount_amount || 0;
                        if (promoCalc.free_delivery) {
                            isFreeDelivery = true;
                        }
                        // Increment usage count
                        await pool.query(
                            'UPDATE public."PromoCodes" SET used_count = used_count + 1 WHERE id = $1',
                            [promoCalc.promoId]
                        );
                    }
                }
            } catch (pErr) {
                console.warn('Error applying promo in OrderService:', pErr.message);
            }

            const calculatedDeliveryCost = isFreeDelivery ? 0 : parseFloat(deliveryCost);
            const calculatedFinalTotal = Math.max(0, parseFloat(cartTotal) - discountAmount) + calculatedDeliveryCost;

            // Create an order for each item in the cart
            const orderResults = [];

            for (const item of items) {
                const order = {
                    user_id: userId, // Add user_id for authenticated orders
                    shipping_name: shippingName,
                    shipping_address: shippingAddress || '',
                    city: city,
                    first_name: firstName,
                    last_name: lastName,
                    product_id: item.id,
                    quantity: item.quantity,
                    order_date: new Date().toISOString(),
                    status: 'قيد المعالجة',
                    products_price: cartTotal,
                    delivery_price: calculatedDeliveryCost,
                    total_price: calculatedFinalTotal,
                    order_group: orderRef,
                    promo_code: appliedPromo ? appliedPromo.code : null,
                    discount_amount: discountAmount
                };

                // Insert order
                const { data: orderData, error: orderError } = await supabase
                    .from('Orders')
                    .insert(order)
                    .select()
                    .single();

                if (orderError) throw orderError;

                // Get current stock and update it
                const { data: product, error: stockCheckError } = await supabase
                    .from('Products')
                    .select('stock')
                    .eq('id', item.id)
                    .single();
                
                if (stockCheckError) throw stockCheckError;
                
                const newStock = product.stock - item.quantity;
                const { error: stockError } = await supabase
                    .from('Products')
                    .update({ stock: newStock })
                    .eq('id', item.id);

                if (stockError) throw stockError;

                orderResults.push(orderData);
            }

            // Return the first order's ID as the main order ID with promo details
            return { 
                order_id: orderResults[0].id,
                order_ref: orderRef,
                appliedPromo,
                discountAmount,
                calculatedDeliveryCost,
                calculatedFinalTotal
            };
        } catch (error) {
            console.error('Database error:', error);
            throw new Error('فشل في إنشاء الطلب في قاعدة البيانات');
        }
    }

    static async createGuestOrder({
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
    }) {
        try {
            // Create an order for each item in the cart
            const orderResults = [];

            for (const item of items) {
                const order = {
                    shipping_name: shippingName,
                    shipping_address: shippingAddress || '',
                    city: city,
                    first_name: firstName,
                    last_name: lastName,
                    product_id: item.id,
                    quantity: item.quantity,
                    order_date: new Date().toISOString(),
                    status: 'قيد المعالجة',
                    products_price: cartTotal,
                    delivery_price: deliveryCost,
                    total_price: finalTotal,
                    order_group: orderRef
                };

                // Insert order
                const { data: orderData, error: orderError } = await supabase
                    .from('Orders')
                    .insert(order)
                    .select()
                    .single();

                if (orderError) throw orderError;

                // Get current stock and update it
                const { data: product, error: stockCheckError } = await supabase
                    .from('Products')
                    .select('stock')
                    .eq('id', item.id)
                    .single();
                
                if (stockCheckError) throw stockCheckError;
                
                const newStock = product.stock - item.quantity;
                const { error: stockError } = await supabase
                    .from('Products')
                    .update({ stock: newStock })
                    .eq('id', item.id);

                if (stockError) throw stockError;

                orderResults.push(orderData);
            }

            // Return the first order's ID as the main order ID
            return { 
                order_id: orderResults[0].id,
                order_ref: orderRef
            };
        } catch (error) {
            console.error('Database error:', error);
            throw new Error('فشل في إنشاء الطلب في قاعدة البيانات');
        }
    }

    static async validateStock(items) {
        try {
            // Get all product IDs
            const productIds = items.map(item => item.id);

            // Fetch current stock levels
            const { data: products, error } = await supabase
                .from('Products')  // Changed from 'products' to 'Products'
                .select('id, stock')
                .in('id', productIds);

            if (error) throw error;

            // Create a map of product stocks
            const stockMap = products.reduce((map, product) => {
                map[product.id] = product.stock;
                return map;
            }, {});

            // Validate each item
            for (const item of items) {
                const currentStock = stockMap[item.id] || 0;
                if (currentStock < item.quantity) {
                    throw new Error(`المنتج غير متوفر بالكمية المطلوبة`);
                }
            }

            return true;
        } catch (error) {
            console.error('Stock validation error:', error);
            throw error;
        }
    }

    static async validateDeliveryCost(city, deliveryCost, companyId = null) {
        try {
            const cost = parseFloat(deliveryCost);
            if (isNaN(cost) || cost < 0) {
                throw new Error('تكلفة التوصيل غير صحيحة');
            }

            // First try to check against database rates for company
            const pool = require('../db');
            let query = `
                SELECT r.home_price, r.desk_price 
                FROM public."DeliveryRates" r
                JOIN public."DeliveryCompanies" c ON c.id = r.company_id
                WHERE (r.city_name ILIKE $1 OR r.city_name = $1)
            `;
            const params = [city];
            if (companyId) {
                query += ` AND c.id = $2`;
                params.push(parseInt(companyId, 10));
            } else {
                query += ` AND c.is_active = true`;
            }
            query += ` ORDER BY c.is_default DESC, c.id ASC LIMIT 1`;

            const { rows } = await pool.query(query, params);

            if (rows.length > 0) {
                const home = parseFloat(rows[0].home_price) || 0;
                const desk = parseFloat(rows[0].desk_price) || 0;
                // Valid if matches home price or desk price within 1.0 tolerance
                if (Math.abs(home - cost) <= 1.0 || Math.abs(desk - cost) <= 1.0) {
                    return true;
                }
            }

            // Fallback check against predefined city rates
            const cities = {
                "Adrar": 1200, "Chlef": 800, "Laghouat": 1100, "Oum El Bouaghi": 800, 
                "Batna": 800, "Béjaïa": 800, "Biskra": 1100, "Béchar": 1200, "Blida": 600,
                "Bouira": 800, "Tamanrasset": 1950, "Tébessa": 1100, "Tlemcen": 800,
                "Tiaret": 800, "Tizi Ouzou": 800, "Algiers": 500, "Djelfa": 1100,
                "Jijel": 800, "Sétif": 800, "Saïda": 900, "Skikda": 900,
                "Sidi Bel Abbès": 800, "Annaba": 800, "Guelma": 900, "Constantine": 800,
                "Médéa": 800, "Mostaganem": 800, "M'Sila": 800, "Mascara": 800,
                "Ouargla": 1100, "Oran": 800, "El Bayadh": 1200, "Illizi": 2000,
                "Bordj Bou Arréridj": 800, "Boumerdès": 600, "El Tarf": 900,
                "Tindouf": 1950, "Tissemsilt": 900, "El Oued": 1100, "Khenchela": 900,
                "Souk Ahras": 900, "Tipaza": 600, "Mila": 800, "Aïn Defla": 800,
                "Naâma": 1200, "Aïn Témouchent": 800, "Ghardaïa": 1100, "Relizane": 800,
                "Timimoun": 1200, "Bordj Badji Mokhtar": 2000, "Ouled Djellal": 1100,
                "Béni Abbès": 1200, "In Salah": 1950, "In Guezzam": 1950,
                "Touggourt": 1100, "Djanet": 1950, "El M'Ghair": 1100, "El Menia": 1100
            };

            const expectedCost = cities[city];
            if (expectedCost !== undefined && (Math.abs(expectedCost - cost) <= 1.0 || cost >= 200)) {
                return true;
            }

            // If reasonable positive delivery price (between 100 and 5000 DZD), accept
            if (cost >= 100 && cost <= 5000) {
                return true;
            }

            throw new Error('تكلفة التوصيل غير صحيحة');
        } catch (error) {
            console.error('Delivery cost validation error:', error);
            if (parseFloat(deliveryCost) >= 0) return true;
            throw error;
        }
    }
}

module.exports = OrderService;
