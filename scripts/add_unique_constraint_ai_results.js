
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
        console.log("🚀 Starting migration: Add UNIQUE constraint to prescription_ai_results(prescription_id)...");

        // Check if constraint exists (optional, but good for idempotency) - OR just try to add it
        // We will try to add it. If it fails because it exists, that's fine (or we catch it).
        // syntax: ALTER TABLE prescription_ai_results ADD CONSTRAINT prescription_ai_results_prescription_id_key UNIQUE (prescription_id);

        await client.query('BEGIN');

        // Check if table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'prescription_ai_results'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log("⚠️ Table 'prescription_ai_results' does not exist. Creating it now...");
            await client.query(`
                CREATE TABLE prescription_ai_results (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
                    suggested_meds JSONB,
                    confidence_score INTEGER,
                    created_at TIMESTAMP DEFAULT NOW(),
                    CONSTRAINT prescription_ai_results_prescription_id_key UNIQUE (prescription_id)
                );
            `);
            console.log("✅ Table created with UNIQUE constraint.");
        } else {
            // specific check for the constraint
            const constraintCheck = await client.query(`
                SELECT 1 FROM pg_constraint WHERE conname = 'prescription_ai_results_prescription_id_key';
             `);

            if (constraintCheck.rowCount === 0) {
                await client.query(`
                     ALTER TABLE prescription_ai_results 
                     ADD CONSTRAINT prescription_ai_results_prescription_id_key UNIQUE (prescription_id);
                 `);
                console.log("✅ UNIQUE constraint added to 'prescription_ai_results'.");
            } else {
                console.log("ℹ️ Constraint 'prescription_ai_results_prescription_id_key' already exists.");
            }
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
