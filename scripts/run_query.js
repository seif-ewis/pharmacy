import db from '../src/config/dataBase.js';

const query = process.argv[2];

async function main() {
    if (!query) {
        console.error('No query provided');
        process.exit(1);
    }
    try {
        const res = await db.query(query);
        console.log('Results:');
        console.table(res.rows);
    } catch (err) {
        console.error('Query Error:', err);
    } finally {
        process.exit();
    }
}

main();
