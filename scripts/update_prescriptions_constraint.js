
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

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
        console.log("🚀 Starting migration: Update prescriptions status check...");

        await client.query('BEGIN');

        // 1. Drop existing constraint
        await client.query(`
            ALTER TABLE prescriptions 
            DROP CONSTRAINT IF EXISTS prescriptions_status_check;
        `);
        console.log("✅ Dropped old constraint.");

        // 2. Add new constraint with expanded values
        // Must include existing values: reviewing, processing, outtodelevery, canceled, done
        // Plus new values: pending, approved, rejected, completed
        await client.query(`
            ALTER TABLE prescriptions 
            ADD CONSTRAINT prescriptions_status_check 
            CHECK (status IN (
                'reviewing', 'processing', 'outtodelevery', 'canceled', 'done',
                'pending', 'approved', 'rejected', 'completed'
            ));
        `);
        console.log("✅ Added new constraint with merged status list.");

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
