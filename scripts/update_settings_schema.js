
import db from "../src/config/dataBase.js";

async function updateSchema() {
    try {
        console.log("Connecting to database...");
        await db.query(`
            ALTER TABLE pharmacy_settings 
            ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0.10,
            ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 5.00;
        `);
        console.log("Schema updated: Added tax_rate and delivery_fee to pharmacy_settings.");

        // Ensure at least one setting row exists
        await db.query(`
            INSERT INTO pharmacy_settings (id, is_open, tax_rate, delivery_fee)
            VALUES (gen_random_uuid(), true, 0.10, 5.00)
            ON CONFLICT DO NOTHING;
        `);
        console.log("Ensured default settings row exists.");

    } catch (err) {
        console.error("Schema update failed:", err);
    } finally {
        process.exit();
    }
}

updateSchema();
