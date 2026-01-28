
import db from '../src/config/dataBase.js';

const checkPromotion = async () => {
    try {
        console.log("Checking 'WELCOME20' promotion details...");
        const res = await db.query("SELECT * FROM promotions WHERE code = 'WELCOME20'");

        if (res.rows.length > 0) {
            console.log("Promotion found:", res.rows[0]);

            // detailed check of dates
            const promo = res.rows[0];
            const now = new Date();
            console.log("Current Time:", now);
            console.log("Start Date:", promo.start_date);
            console.log("End Date:", promo.end_date);
            console.log("Is Active:", promo.is_active);

            if (now >= promo.start_date && now <= promo.end_date && promo.is_active) {
                console.log("✅ Promotion is VALID based on generic criteria.");
            } else {
                console.log("❌ Promotion is INVALID based on generic criteria.");
            }

        } else {
            console.log("❌ Promotion 'WELCOME20' NOT found.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error checking promotion:", err);
        process.exit(1);
    }
};

checkPromotion();
