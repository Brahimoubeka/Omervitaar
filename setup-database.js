require('dotenv').config();
const supabase = require('./supabase');

async function setupDatabase() {
    try {
        // Create products table
        const { error: productsError } = await supabase.rpc('create_products_table', {
            sql: `
                CREATE TABLE IF NOT EXISTS public.products (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10, 2) NOT NULL,
                    stock INTEGER NOT NULL DEFAULT 0,
                    image_url VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `
        });

        if (productsError) {
            console.error('Error creating products table:', productsError);
            return;
        }

        // Create orders table
        const { error: ordersError } = await supabase.rpc('create_orders_table', {
            sql: `
                CREATE TABLE IF NOT EXISTS public.orders (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id UUID,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    total_amount DECIMAL(10, 2) NOT NULL,
                    shipping_address TEXT NOT NULL,
                    shipping_name VARCHAR(255) NOT NULL,
                    city VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `
        });

        if (ordersError) {
            console.error('Error creating orders table:', ordersError);
            return;
        }

        // Create order_items table
        const { error: orderItemsError } = await supabase.rpc('create_order_items_table', {
            sql: `
                CREATE TABLE IF NOT EXISTS public.order_items (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    order_id UUID REFERENCES public.orders(id),
                    product_id UUID REFERENCES public.products(id),
                    quantity INTEGER NOT NULL,
                    price_at_time DECIMAL(10, 2) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `
        });

        if (orderItemsError) {
            console.error('Error creating order_items table:', orderItemsError);
            return;
        }

        console.log('Database setup completed successfully!');
    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

setupDatabase();
