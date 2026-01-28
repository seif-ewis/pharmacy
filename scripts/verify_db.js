import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

async function verify() {
    const client = new Client({
        connectionString: `postgres://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`
    });

    try {
        await client.connect();

        const tables = ['product_requests', 'availability_notifications'];
        for (const table of tables) {
            const res = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);

            console.log(`Table '${table}' exists: ${res.rows[0].exists}`);
        }
    } catch (err) {
        console.error('Verification failed:', err.message);
    } finally {
        await client.end();
    }
}

verify();
