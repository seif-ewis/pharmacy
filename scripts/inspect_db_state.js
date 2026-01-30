
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
        const resStatus = await client.query("SELECT DISTINCT status FROM prescriptions");
        const resConstraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'prescriptions'::regclass;
        `);

        const output = {
            statuses: resStatus.rows,
            constraints: resConstraints.rows
        };

        fs.writeFileSync(path.join(__dirname, '../db_state.json'), JSON.stringify(output, null, 2));
        console.log("✅ State written to db_state.json");

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        client.release();
        pool.end();
    }
}

inspect();
