import db from '../src/config/dataBase.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function createAdmin() {
    const email = 'admin@hosam.com';
    const password = 'admin123';
    const fullName = 'System Administrator';

    try {
        console.log('--- Creating Admin User (Single Role System) ---');

        const hash = await bcrypt.hash(password, 10);

        // 1. Check if exists
        const check = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            console.log('Admin already exists. Updating role and password...');
            await db.query("UPDATE users SET role = 'admin', password_hash = $1 WHERE email = $2", [hash, email]);
            console.log('✅ Updated successfully.');
            process.exit(0);
        }

        // 3. Insert user
        await db.query(
            "INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES ($1, $2, $3, $4, 'admin', NOW())",
            [uuidv4(), email, hash, fullName]
        );

        console.log('✅ Admin user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);

    } catch (err) {
        console.error('❌ Failed to create admin:', err);
    } finally {
        process.exit();
    }
}

createAdmin();
