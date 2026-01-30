
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), '.env');
console.log(`🔍 Looking for .env at: ${envPath}`);

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error("❌ .env file not found");
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
        console.log("🚀 Starting migration: Fix prescriptions_status_check constraint...");

        await client.query('BEGIN');

        // 1. Drop existing constraint
        // We wrap in a DO block or just try/catch, but simpler to just ALTER TABLE DROP CONSTRAINT IF EXISTS
        await client.query(`
            ALTER TABLE prescriptions 
            DROP CONSTRAINT IF EXISTS prescriptions_status_check;
        `);
        console.log("✅ Dropped old constraint (if existed).");

        // 2. Add new constraint with expanded values
        await client.query(`
            ALTER TABLE prescriptions 
            ADD CONSTRAINT prescriptions_status_check 
            CHECK (status IN ('pending', 'approved', 'rejected'));
        `);
        console.log("✅ Added new constraint: status IN ('pending', 'approved', 'rejected')");

        await client.query('COMMIT');
        console.log("🎉 Migration completed successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
