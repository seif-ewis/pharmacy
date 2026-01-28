
import db from '../src/config/dataBase.js';

async function createShiftsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS shifts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                doctor_id UUID REFERENCES users(id),
                start_at TIMESTAMP DEFAULT NOW(),
                end_at TIMESTAMP,
                total_revenue NUMERIC DEFAULT 0,
                prescriptions_count INTEGER DEFAULT 0,
                orders_count INTEGER DEFAULT 0,
                cancelled_count INTEGER DEFAULT 0,
                returns_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE
            );
        `);
        console.log('✅ shifts table created');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating shifts table:', err);
        process.exit(1);
    }
}

createShiftsTable();
