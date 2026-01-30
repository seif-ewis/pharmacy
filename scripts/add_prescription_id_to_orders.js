
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try resolving .env from process.cwd()
const envPath = path.resolve(process.cwd(), '.env');
console.log(`🔍 Looking for .env at: ${envPath}`);

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log("✅ Loaded .env file.");
} else {
    console.error("❌ .env file not found at " + envPath);
}


if (!process.env.PG_DATABASE) {
    console.error("❌ PG_DATABASE is missing in environment variables.");
    process.exit(1);
}

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');

        // Check if column exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='prescription_id';
        `);

        if (res.rows.length === 0) {
            console.log('⚠️ Column prescription_id does not exist in orders table. Adding it...');
            await client.query(`
                ALTER TABLE orders 
                ADD COLUMN prescription_id UUID REFERENCES prescriptions(id);
            `);
            console.log('✅ Successfully added prescription_id column to orders table.');
        } else {
            console.log('ℹ️ Column prescription_id already exists.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
