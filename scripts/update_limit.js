
import db from '../src/config/dataBase.js';

const updateLimit = async () => {
    try {
        console.log("Setting usage_limit_per_user = 1 for WELCOME20...");

        await db.query(`
            UPDATE promotions 
            SET usage_limit_per_user = 1
            WHERE code = 'WELCOME20'
        `);

        console.log("Updated successfully! Dynamic logic will now enforce this.");
        process.exit(0);
    } catch (err) {
        console.error("Error updating limit:", err);
        process.exit(1);
    }
};

updateLimit();
