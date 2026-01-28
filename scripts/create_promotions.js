
import db from '../src/config/dataBase.js';

const createPromotions = async () => {
    try {
        console.log("Checking for 'WELCOME20' promotion...");
        const res = await db.query("SELECT * FROM promotions WHERE code = 'WELCOME20'");

        if (res.rows.length === 0) {
            console.log("Creating 'WELCOME20' promotion...");
            await db.query(`
                INSERT INTO promotions (
                    id, code, label, description, discount_type, discount_value, 
                    min_order_amount, start_date, end_date, is_active, is_public, created_at
                ) VALUES (
                    gen_random_uuid(), 'WELCOME20', 'Welcome Offer', '20% off your first order', 
                    'percentage', 20, 0, NOW(), NOW() + INTERVAL '1 year', true, true, NOW()
                )
            `);
            console.log("Promotion 'WELCOME20' created successfully!");
        } else {
            console.log("Promotion 'WELCOME20' already exists.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error creating promotion:", err);
        process.exit(1);
    }
};

createPromotions();
