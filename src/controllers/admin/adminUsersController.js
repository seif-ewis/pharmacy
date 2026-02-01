import db from "../../config/dataBase.js";
import bcrypt from "bcrypt";

// GET: All Users with Search & Filter
export const getUsers = async (req, res) => {
    const { search, role } = req.query;
    let query = `
        SELECT id, full_name, email, phone, role, created_at, total_orders_placed
        FROM users
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        params.push(`%${search}%`);
        query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    if (role && role !== 'all') {
        params.push(role);
        query += ` AND role = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    try {
        const result = await db.query(query, params);
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error("Get Users Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};

// GET: View Doctors & Stats
export const getDoctors = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
            (SELECT COUNT(*) FROM orders WHERE processed_by = u.id) as orders_count,
            (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE processed_by = u.id) as total_revenue
            FROM users u
            WHERE u.role = 'doctor'
            ORDER BY u.created_at DESC
        `);

        res.json({ success: true, doctors: result.rows });
    } catch (err) {
        console.error("Get Doctors Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch doctors" });
    }
};

// POST: Add New Doctor
export const addDoctor = async (req, res) => {
    const { full_name, email, password, phone } = req.body;

    try {
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required" });
        }

        const userExists = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: "User with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users (id, full_name, email, password_hash, phone, role, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'doctor', NOW())",
            [full_name, email, hashedPassword, phone]
        );

        res.json({ success: true, message: "Doctor added successfully" });
    } catch (err) {
        console.error("Add Doctor Error:", err);
        res.status(500).json({ success: false, message: "Failed to create doctor account" });
    }
};
