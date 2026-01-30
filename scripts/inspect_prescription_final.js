
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

async function inspect() {
    const client = await pool.connect();
    try {
        console.log("🔍 Checking 'prescription_final' schema...");

        // Check if table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'prescription_final'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log("❌ Table 'prescription_final' DOES NOT EXIST.");
            fs.writeFileSync(path.join(__dirname, '../prescription_schema.json'), JSON.stringify({ exists: false }, null, 2));
            return;
        }

        // Get columns
        const resColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'prescription_final';
        `);

        console.log("✅ Table found. Columns:");
        console.table(resColumns.rows);

        const output = {
            exists: true,
            columns: resColumns.rows
        };

        fs.writeFileSync(path.join(__dirname, '../prescription_schema.json'), JSON.stringify(output, null, 2));
        console.log("✅ Schema written to prescription_schema.json");

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        client.release();
        pool.end();
    }
}

inspect();
