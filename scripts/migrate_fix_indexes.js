
import db from '../src/config/dataBase.js';

const migrateIndexes = async () => {
    try {
        console.log("Starting index optimization...");

        // 1. Drop misused/weak indexes
        console.log("Dropping weak indexes...");
        await db.query(`DROP INDEX IF EXISTS idx_orders_user_date`);
        await db.query(`DROP INDEX IF EXISTS idx_messages_chat_time`);

        // 2. Create corrected composite indexes
        // Optimized for: WHERE user_id = X ORDER BY created_at DESC
        console.log("Creating corrected composite indexes...");
        await db.query(`CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC)`);
        await db.query(`CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at ASC)`);

        // 3. Create missing sorting indexes
        // Essential for dashboard/analytics time-range queries
        console.log("Creating missing sorting indexes...");
        await db.query(`CREATE INDEX idx_orders_created_at ON orders(created_at DESC)`);
        await db.query(`CREATE INDEX idx_payments_created_at ON payments(created_at DESC)`);
        await db.query(`CREATE INDEX idx_returns_created_at ON returns(created_at DESC)`);

        // Also good for pharmacy_status_logs as we fetch "ORDER BY created_at DESC LIMIT 1"
        await db.query(`CREATE INDEX idx_pharmacy_logs_created ON pharmacy_status_logs(created_at DESC)`);

        console.log("✅ Index optimization complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrateIndexes();
