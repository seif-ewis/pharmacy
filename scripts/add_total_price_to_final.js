
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
        console.log("🚀 Starting migration: Add 'total_price' to 'prescription_final'...");

        await client.query('BEGIN');

        // Check if column exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'prescription_final' AND column_name = 'total_price';
        `);

        if (res.rowCount === 0) {
            await client.query(`
                ALTER TABLE prescription_final 
                ADD COLUMN total_price NUMERIC DEFAULT 0;
            `);
            console.log("✅ Added column 'total_price' (NUMERIC).");
        } else {
            console.log("ℹ️ Column 'total_price' already exists.");
        }

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
