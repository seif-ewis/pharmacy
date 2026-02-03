import db from '../src/config/dataBase.js';

async function run() {
    const client = await db.connect();
    try {
        console.log('Adding resend columns to password_resets...');
        await client.query(`
            ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS resend_count INTEGER DEFAULT 0;
            ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP DEFAULT NOW();
        `);
        console.log('Done.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
