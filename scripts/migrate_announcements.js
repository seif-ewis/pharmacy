
import db from '../src/config/dataBase.js';

const createTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                target_audience VARCHAR(50) NOT NULL CHECK (target_audience IN ('all', 'active_orders', 'staff')),
                scheduled_for TIMESTAMP,
                status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
                created_by UUID,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Announcements table created successfully.");
        process.exit();
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
};

createTable();
