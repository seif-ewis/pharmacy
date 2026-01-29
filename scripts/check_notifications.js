import db from '../src/config/dataBase.js';

const result = await db.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name = 'notifications'
    ORDER BY ordinal_position
`);

console.log('📋 Notifications table columns:\n');
result.rows.forEach(col => {
    console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(30)} ${col.column_default || ''}`);
});

process.exit(0);
