import db from '../src/config/dataBase.js';

console.log('🔐 Setting up Roles & Permissions system...\n');

try {
    // ============================================================
    // STEP 1: Create roles table
    // ============================================================
    console.log('Step 1: Creating roles table...');
    await db.query(`
        CREATE TABLE IF NOT EXISTS roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    console.log('✅ roles table created\n');

    // ============================================================
    // STEP 2: Insert default roles
    // ============================================================
    console.log('Step 2: Inserting default roles...');

    // Check if roles already exist
    const existingRoles = await db.query('SELECT name FROM roles');
    const existingRoleNames = existingRoles.rows.map(r => r.name);

    const defaultRoles = [
        { name: 'admin', description: 'Full system access and administrative privileges' },
        { name: 'pharmacist', description: 'Doctor/Pharmacist with ability to manage orders and prescriptions' },
        { name: 'customer', description: 'Regular customer with shopping and ordering capabilities' }
    ];

    for (const role of defaultRoles) {
        if (!existingRoleNames.includes(role.name)) {
            await db.query(
                'INSERT INTO roles (name, description) VALUES ($1, $2)',
                [role.name, role.description]
            );
            console.log(`   ✓ Created role: ${role.name}`);
        } else {
            console.log(`   ⊘ Role already exists: ${role.name}`);
        }
    }
    console.log('✅ Default roles ready\n');

    // ============================================================
    // STEP 3: Create user_roles junction table
    // ============================================================
    console.log('Step 3: Creating user_roles table...');
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, role_id)
        );
    `);

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_user_roles_user 
        ON user_roles(user_id);
    `);

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_user_roles_role 
        ON user_roles(role_id);
    `);

    console.log('✅ user_roles table created\n');

    // ============================================================
    // STEP 4: Migrate existing user roles from users table
    // ============================================================
    console.log('Step 4: Migrating existing user roles...');

    // Get all roles
    const rolesRes = await db.query('SELECT id, name FROM roles');
    const rolesMap = {};
    rolesRes.rows.forEach(role => {
        rolesMap[role.name] = role.id;
    });

    // Get all users with their current roles
    const usersRes = await db.query('SELECT id, role FROM users WHERE role IS NOT NULL');

    let migrated = 0;
    for (const user of usersRes.rows) {
        const roleId = rolesMap[user.role];
        if (roleId) {
            // Check if already migrated
            const exists = await db.query(
                'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
                [user.id, roleId]
            );

            if (exists.rows.length === 0) {
                await db.query(
                    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                    [user.id, roleId]
                );
                migrated++;
            }
        }
    }

    console.log(`✅ Migrated ${migrated} user role assignments\n`);

    // ============================================================
    // Summary
    // ============================================================
    console.log('🎉 Roles & Permissions system setup complete!\n');
    console.log('📊 Summary:');
    console.log('   - roles table: Created with 3 default roles');
    console.log('   - user_roles table: Created with junction relationships');
    console.log(`   - Migrated: ${migrated} existing user roles`);
    console.log('\n⚠️  Next steps:');
    console.log('   1. Update auth middleware to query user_roles');
    console.log('   2. Keep users.role column for backward compatibility (optional)');
    console.log('   3. Update user creation to insert into user_roles\n');

    process.exit(0);
} catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
}
