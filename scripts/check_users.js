import db from '../src/config/dataBase.js';

async function check() {
    try {
        const cols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));

        const count = await db.query("SELECT COUNT(*) FROM users");
        console.log('Total users:', count.rows[0].count);

        const users = await db.query("SELECT email, role FROM users LIMIT 5");
        console.log('Sample Users:');
        users.rows.forEach(u => console.log(`- ${u.email} (${u.role})`));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
