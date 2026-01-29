
import db from '../src/config/dataBase.js';

const createTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                action_type VARCHAR(50) NOT NULL,
                entity_id UUID,
                entity_type VARCHAR(50),
                performed_by UUID NOT NULL,
                details JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Audit Logs table created successfully.");
        process.exit();
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
};

createTable();
