
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkData() {
    const client = new Client({
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: process.env.PG_PORT,
    });

    try {
        await client.connect();
        const res = await client.query(`SELECT DISTINCT status FROM prescriptions;`);
        console.log('Current statuses in table:', res.rows.map(r => r.status));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkData();
