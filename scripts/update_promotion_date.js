
import db from '../src/config/dataBase.js';

const fixPromotion = async () => {
    try {
        console.log("Fixing 'WELCOME20' promotion dates...");

        // Update the date to ensure it is valid
        await db.query(`
            UPDATE promotions 
            SET start_date = NOW() - INTERVAL '1 day',
                end_date = NOW() + INTERVAL '1 year',
                is_active = true
            WHERE code = 'WELCOME20'
        `);

        console.log("Promotion 'WELCOME20' dates updated successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error updating promotion:", err);
        process.exit(1);
    }
};

fixPromotion();
