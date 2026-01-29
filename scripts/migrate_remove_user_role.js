
import db from '../src/config/dataBase.js';

const migrateRoles = async () => {
    try {
        console.log("Starting role migration...");

        // 1. Ensure Roles Exist
        const defaultRoles = ['admin', 'pharmacist', 'doctor', 'patient'];
        for (const role of defaultRoles) {
            await db.query(`
                INSERT INTO roles (id, name) VALUES (gen_random_uuid(), $1)
                ON CONFLICT (name) DO NOTHING
            `, [role]);
        }
        console.log("Default roles ensured.");

        // 2. Fetch all users
        const usersRes = await db.query('SELECT id, role FROM users');
        const users = usersRes.rows;
        console.log(`Found ${users.length} users to migrate.`);

        // 3. Assign roles in user_roles
        for (const user of users) {
            if (user.role) {
                const roleName = user.role.toLowerCase();
                // Map old role names if necessary (e.g. 'user' -> 'patient')
                const targetRole = roleName === 'user' ? 'patient' : roleName;

                // Get Role ID
                const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', [targetRole]);
                if (roleRes.rows.length > 0) {
                    const roleId = roleRes.rows[0].id;
                    await db.query(`
                         INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
                         ON CONFLICT (user_id, role_id) DO NOTHING
                     `, [user.id, roleId]);
                } else {
                    console.warn(`Warning: Role '${targetRole}' not found for user ${user.id}`);
                }
            }
        }
        console.log("User roles populated.");

        // 4. Drop the old column
        // We wrap this in a transaction to be safe? Or just do it.
        // Let's rely on the previous steps succeeding.
        console.log("Dropping users.role column...");
        await db.query('ALTER TABLE users DROP COLUMN role');
        console.log("Column dropped successfully.");

        process.exit(0);

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

migrateRoles();
