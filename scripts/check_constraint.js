
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkConstraint() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'prescriptions'::regclass 
            AND conname = 'prescriptions_status_check';
        `);
        console.log('Constraint Definition:', res.rows[0]?.pg_get_constraintdef || 'Not found');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkConstraint();
