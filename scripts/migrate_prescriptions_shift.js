
import db from '../src/config/dataBase.js';

const migratePrescriptionsShift = async () => {
    try {
        console.log("Starting prescription schema migration...");

        // 1. Add shift_id to prescriptions table
        console.log("Adding shift_id column to prescriptions...");
        await db.query(`
            ALTER TABLE prescriptions 
            ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL
        `);

        // 2. Create index for performance
        console.log("Creating index for prescriptions.shift_id...");
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_prescriptions_shift ON prescriptions(shift_id)
        `);

        console.log("✅ Prescription schema update complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migratePrescriptionsShift();
