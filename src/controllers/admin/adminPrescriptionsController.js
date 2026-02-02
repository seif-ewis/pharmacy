import db from "../../config/dataBase.js";

// GET: All prescriptions with status filter
export const getPrescriptions = async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 15 } = req.query;
        const offset = (page - 1) * limit;

        const result = await db.query(`
            SELECT p.*, u.full_name as customer_name, u.email as customer_email
            FROM prescriptions p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = $1
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `, [status, limit, offset]);

        const countRes = await db.query("SELECT COUNT(*) FROM prescriptions WHERE status = $1", [status]);

        res.json({
            success: true,
            prescriptions: result.rows,
            totalCount: countRes.rows[0].count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(countRes.rows[0].count / limit)
        });
    } catch (err) {
        console.error("Get Prescriptions Error:", err);
        res.status(500).json({ success: false });
    }
};

// GET: Prescription details (including AI and Final)
export const getPrescriptionDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const prescRes = await db.query(`
             SELECT p.*, u.full_name as customer_name
             FROM prescriptions p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = $1
        `, [id]);

        if (prescRes.rows.length === 0) return res.status(404).json({ success: false });

        const aiRes = await db.query("SELECT * FROM prescription_ai_results WHERE prescription_id = $1", [id]);
        const finalRes = await db.query("SELECT * FROM prescription_final WHERE prescription_id = $1", [id]);

        res.json({
            success: true,
            prescription: prescRes.rows[0],
            ai_results: aiRes.rows[0] || null,
            final_decision: finalRes.rows[0] || null
        });
    } catch (err) {
        console.error("Get Prescription Details Error:", err);
        res.status(500).json({ success: false });
    }
};

// POST: Process Prescription
export const processPrescription = async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { status, final_meds, notes } = req.body;
        const doctor_id = req.user.id;

        await client.query("UPDATE prescriptions SET status = $1 WHERE id = $2", [status, id]);

        await client.query(`
            INSERT INTO prescription_final (prescription_id, approved_by, final_meds, notes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (prescription_id) DO NOTHING
        `, [id, doctor_id, JSON.stringify(final_meds), notes]);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Process Prescription Error:", err);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
};
