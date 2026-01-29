import db from '../config/dataBase.js';

/**
 * Check if user has a specific role
 * @param {string} userId - User UUID
 * @param {string} roleName - Role name to check (admin, pharmacist, customer)
 * @returns {Promise<boolean>}
 */
export async function hasRole(userId, roleName) {
    const result = await db.query(`
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND r.name = $2
        LIMIT 1
    `, [userId, roleName]);

    return result.rows.length > 0;
}

/**
 * Get all roles for a user
 * @param {string} userId - User UUID
 * @returns {Promise<string[]>} Array of role names
 */
export async function getUserRoles(userId) {
    const result = await db.query(`
        SELECT r.name FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
    `, [userId]);

    return result.rows.map(row => row.name);
}

/**
 * Assign role to user
 * @param {string} userId - User UUID
 * @param {string} roleName - Role name to assign
 */
export async function assignRole(userId, roleName) {
    const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleRes.rows.length === 0) {
        throw new Error(`Role '${roleName}' does not exist`);
    }

    const roleId = roleRes.rows[0].id;

    // Insert if not exists
    await db.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
    `, [userId, roleId]);
}

/**
 * Remove role from user
 * @param {string} userId - User UUID
 * @param {string} roleName - Role name to remove
 */
export async function removeRole(userId, roleName) {
    await db.query(`
        DELETE FROM user_roles
        WHERE user_id = $1 AND role_id = (SELECT id FROM roles WHERE name = $2)
    `, [userId, roleName]);
}

/**
 * Check if user has any of the specified roles
 * @param {string} userId - User UUID
 * @param {string[]} roleNames - Array of role names
 * @returns {Promise<boolean>}
 */
export async function hasAnyRole(userId, roleNames) {
    const result = await db.query(`
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND r.name = ANY($2)
        LIMIT 1
    `, [userId, roleNames]);

    return result.rows.length > 0;
}
