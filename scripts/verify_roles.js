import db from '../src/config/dataBase.js';

console.log('🔍 Verifying Roles & Permissions System...\n');

try {
    // Check roles table
    const roles = await db.query('SELECT * FROM roles ORDER BY name');
    console.log('✅ Roles table:');
    roles.rows.forEach(role => {
        console.log(`   - ${role.name.padEnd(15)} (${role.description})`);
    });
    console.log('');

    // Check user_roles table
    const userRoles = await db.query(`
        SELECT u.full_name, u.email, r.name as role_name
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        JOIN roles r ON ur.role_id = r.id
        ORDER BY u.full_name
    `);

    console.log('✅ User Role Assignments:');
    if (userRoles.rows.length === 0) {
        console.log('   (No users with assigned roles via new system)');
    } else {
        userRoles.rows.forEach(ur => {
            console.log(`   - ${ur.full_name.padEnd(20)} → ${ur.role_name}`);
        });
    }
    console.log('');

    // Check indexes
    const indexes = await db.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename IN ('roles', 'user_roles')
        ORDER BY tablename, indexname
    `);

    console.log('✅ Indexes created:');
    indexes.rows.forEach(idx => {
        console.log(`   - ${idx.tablename}.${idx.indexname}`);
    });

    console.log('\n🎉 Roles & Permissions system is operational!');
    process.exit(0);
} catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
}
