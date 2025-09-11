-- Create a stored procedure for secure guest order creation
CREATE OR REPLACE FUNCTION create_guest_order(
    p_shipping_name TEXT,
    p_shipping_address TEXT,
    p_city TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_items JSONB,
    p_cart_total DECIMAL,
    p_delivery_cost DECIMAL,
    p_final_total DECIMAL,
    p_order_ref TEXT
) RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function creator
AS $$
DECLARE
    v_order_id INTEGER;
    v_item JSONB;
    v_product_id INTEGER;
    v_quantity INTEGER;
    v_current_stock INTEGER;
BEGIN
    -- Start transaction
    BEGIN
        -- Insert main order record
        INSERT INTO orders (
            shipping_name,
            shipping_address,
            city,
            first_name,
            last_name,
            order_ref,
            status,
            cart_total,
            delivery_cost,
            final_total,
            created_at
        ) VALUES (
            p_shipping_name,
            p_shipping_address,
            p_city,
            p_first_name,
            p_last_name,
            p_order_ref,
            'pending',
            p_cart_total,
            p_delivery_cost,
            p_final_total,
            NOW()
        ) RETURNING id INTO v_order_id;

        -- Process each item
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_product_id := (v_item->>'id')::INTEGER;
            v_quantity := (v_item->>'quantity')::INTEGER;

            -- Check stock availability
            SELECT stock INTO v_current_stock
            FROM products
            WHERE id = v_product_id
            FOR UPDATE; -- Lock the row

            IF v_current_stock < v_quantity THEN
                RAISE EXCEPTION 'المنتج غير متوفر بالكمية المطلوبة';
            END IF;

            -- Update stock
            UPDATE products
            SET stock = stock - v_quantity
            WHERE id = v_product_id;

            -- Insert order item
            INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                price
            ) VALUES (
                v_order_id,
                v_product_id,
                v_quantity,
                (v_item->>'price')::DECIMAL
            );
        END LOOP;

        -- Commit transaction
        RETURN jsonb_build_object(
            'success', true,
            'order_id', v_order_id,
            'order_ref', p_order_ref
        );
    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction on error
        RAISE EXCEPTION 'فشل في إنشاء الطلب: %', SQLERRM;
    END;
END;
$$;
