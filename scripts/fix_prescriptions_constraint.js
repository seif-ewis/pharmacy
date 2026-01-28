
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fixConstraint() {
    const client = new Client({
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: process.env.PG_PORT,
    });

    try {
        await client.connect();

        console.log('Dropping old constraint...');
        await client.query(`ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;`);

        console.log('Adding new constraint...');
        await client.query(`
            ALTER TABLE prescriptions 
            ADD CONSTRAINT prescriptions_status_check 
            CHECK (status IN ('reviewing', 'processing', 'completed', 'pending', 'rejected', 'cancelled', 'approved'));
        `);

        console.log('Constraint updated successfully!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixConstraint();
