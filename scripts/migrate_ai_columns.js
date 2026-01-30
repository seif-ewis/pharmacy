
import db from '../src/config/dataBase.js';

const migrate = async () => {
    try {
        console.log('Starting migration...');

        // Add columns if they don't exist
        await db.query(`
            ALTER TABLE medicines 
            ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS ai_reviewed BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMP;
        `);

        console.log('✅ Added AI columns to medicines table');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
