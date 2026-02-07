import db from "../../config/dataBase.js";
import redisClient from "../../config/redis.js";

// GET: All Promotions
export const getCoupons = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT *,
            (SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = promotions.id) as usage_count
            FROM promotions
            ORDER BY created_at DESC
        `);
        res.json({ success: true, coupons: result.rows });
    } catch (err) {
        console.error("Get Coupons Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch coupons" });
    }
};

// POST: Add New Coupon
export const addCoupon = async (req, res) => {
    const {
        code, label, discount_type, discount_value,
        min_order_amount, usage_limit_global, is_public,
        start_date, end_date, custom_message, highlighted_text
    } = req.body;

    try {
        if (!code || !discount_type || discount_value === undefined) {
            return res.status(400).json({ success: false, message: "Code and discount values are required" });
        }

        // Normalize discount_type
        let finalType = discount_type;
        if (finalType === 'percent') finalType = 'percentage';

        const allowedTypes = ['percentage', 'fixed', 'free_delivery'];
        if (!allowedTypes.includes(finalType)) {
            return res.status(400).json({ success: false, message: "Invalid discount type" });
        }

        // Check unique code
        const exists = await db.query("SELECT id FROM promotions WHERE code = $1", [code.toUpperCase()]);
        if (exists.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Coupon code already exists" });
        }

        await db.query(`
            INSERT INTO promotions (
                id, code, label, discount_type, discount_value, 
                min_order_amount, usage_limit_global, is_public,
                start_date, end_date, is_active, created_at, custom_message, highlighted_text
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), $10, $11
            )
        `, [
            code.toUpperCase(), label, finalType, discount_value,
            min_order_amount || 0, usage_limit_global || null, is_public || false,
            start_date || null, end_date || null, custom_message || null, highlighted_text || null
        ]);

        res.json({ success: true, message: "Coupon created successfully" });
    } catch (err) {
        console.error("Add Coupon Error:", err);
        res.status(500).json({ success: false, message: "Database error creating coupon" });
    }
};

// POST: Toggle Status
export const toggleStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        await db.query("UPDATE promotions SET is_active = $1 WHERE id = $2", [is_active, id]);

        // Invalidate cache in case this was the featured coupon
        await redisClient.del("homepage:featured_coupon");

        res.json({ success: true, message: "Coupon status updated" });
    } catch (err) {
        console.error("Toggle Coupon Status Error:", err);
        res.status(500).json({ success: false, message: "Failed to update status" });
    }
};

// DELETE: Remove Coupon
export const deleteCoupon = async (req, res) => {
    const { id } = req.params;

    try {
        // Only delete if never used
        const used = await db.query("SELECT id FROM promotion_usage WHERE promotion_id = $1 LIMIT 1", [id]);
        if (used.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete a coupon that has already been used. Deactivate it instead." });
        }

        await db.query("DELETE FROM promotions WHERE id = $1", [id]);

        // Invalidate cache in case this was the featured coupon
        await redisClient.del("homepage:featured_coupon");

        res.json({ success: true, message: "Coupon deleted successfully" });
    } catch (err) {
        console.error("Delete Coupon Error:", err);
        res.status(500).json({ success: false, message: "Failed to delete coupon" });
    }
};

// POST: Toggle Featured Status
export const toggleFeatured = async (req, res) => {
    const { id } = req.params;
    const { is_featured } = req.body;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // If enabling, disable all others first
        if (is_featured) {
            await client.query("UPDATE promotions SET is_featured = false");
        }

        await client.query("UPDATE promotions SET is_featured = $1 WHERE id = $2", [is_featured, id]);

        await client.query('COMMIT');

        // Invalidate homepage cache to reflect changes immediately
        await redisClient.del("homepage:featured_coupon");

        res.json({ success: true, message: "Featured status updated" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Toggle Featured Coupon Error:", err);
        res.status(500).json({ success: false, message: "Failed to update featured status" });
    } finally {
        client.release();
    }
};
