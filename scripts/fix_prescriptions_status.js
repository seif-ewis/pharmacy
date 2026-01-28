
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

        console.log('1. Force drop any existing constraint...');
        await client.query(`ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;`);

        console.log('2. Migrating existing data to new statuses...');
        // Map 'approved' -> 'done'
        const res1 = await client.query(`UPDATE prescriptions SET status = 'done' WHERE status = 'approved';`);
        console.log(`Updated ${res1.rowCount} rows from 'approved' to 'done'`);

        // Map everything else -> 'reviewing' if it won't fit the new list
        const res2 = await client.query(`
            UPDATE prescriptions 
            SET status = 'reviewing' 
            WHERE status NOT IN ('reviewing', 'processing', 'outtodelevery', 'canceled', 'done');
        `);
        console.log(`Updated ${res2.rowCount} rows to 'reviewing'`);

        console.log('3. Adding new constraint...');
        await client.query(`
            ALTER TABLE prescriptions 
            ADD CONSTRAINT prescriptions_status_check 
            CHECK (status IN ('reviewing', 'processing', 'outtodelevery', 'canceled', 'done'));
        `);

        console.log('Constraint updated successfully!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixConstraint();
