import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ user: 'postgres', host: 'localhost', database: 'hosam', password: '123456', port: 5432 });
client.connect().then(async () => {
    try {
        const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'returns'");
        console.table(res.rows);

        const data = await client.query("SELECT * FROM returns LIMIT 5");
        console.log('Sample Data:', data.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.end();
    }
});
