import db from "../config/dataBase.js";
import redisClient from "../config/redis.js";
// import { formatTimeAgo } from "../utils/formatDate.js"; // REFACTORED: Now in globalState middleware
import * as chatController from "./chatController.js";

export const getHomePage = async (req, res) => {

    // Define categories once
    const CATEGORIES = ["featuredMedicines", "dailyEssentials", "wellnessProducts", "servicesProducts"];
    const products = {
        featuredMedicines: [],
        dailyEssentials: [],
        wellnessProducts: [],
        servicesProducts: []
    };

    let featuredCoupon = null;

    try {
        const cacheKey = "homepage:products";
        const cachedProducts = await redisClient.get(cacheKey);

        if (cachedProducts) {
            const parsed = JSON.parse(cachedProducts);
            Object.assign(products, parsed);
        } else {
            const result = await db.query(`
                SELECT 
                    m.id, 
                    m.name, 
                    m.description, 
                    m.price, 
                    m.original_price, 
                    m.icon, 
                    COALESCE(ms.current_stock, 0) as quantity,
                    m.category
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) AS rn
                    FROM medicines
                    WHERE category = ANY($1)
                ) m
                LEFT JOIN medicine_stock ms ON ms.id = m.id
                WHERE m.rn <= 10
            `, [CATEGORIES]);

            // Group by category
            result.rows.forEach(row => {
                if (products[row.category]) {
                    products[row.category].push({
                        id: row.id,
                        name: row.name,
                        description: row.description,
                        price: row.price,
                        originalPrice: row.original_price,
                        icon: row.icon,
                        stock: row.quantity
                    });
                }
            });

            // Cache for 60 seconds
            await redisClient.setEx(cacheKey, 60, JSON.stringify(products));
        }

        /* ================= Featured Coupon ================= */
        const couponCacheKey = "homepage:featured_coupon";

        try {
            const cachedCoupon = await redisClient.get(couponCacheKey);
            if (cachedCoupon) {
                featuredCoupon = JSON.parse(cachedCoupon);
            } else {
                const couponRes = await db.query(`
                    SELECT code, discount_type, discount_value, label, custom_message, highlighted_text 
                    FROM promotions 
                    WHERE is_featured = true AND is_active = true 
                    LIMIT 1
                `);
                if (couponRes.rows.length > 0) {
                    featuredCoupon = couponRes.rows[0];
                    await redisClient.setEx(couponCacheKey, 300, JSON.stringify(featuredCoupon)); // Cache for 5 mins
                }
            }
        } catch (err) {
            console.error("Error fetching featured coupon:", err);
            // Non-critical, continue without coupon
        }

    } catch (err) {
        console.error("Homepage medicines error:", err);
        return res.status(500).send("Internal Server Error");
    }





    // ...

    // Notifications now handled globally in globalState middleware

    /* ================= Chat History ================= */
    let activeChat = null;
    let chatMessages = [];
    if (req.isAuthenticated()) {
        try {
            const chatData = await chatController.getChatHistory(req.user.id);
            activeChat = chatData.chat;
            chatMessages = chatData.messages;
        } catch (err) {
            console.error("Home chat history error:", err);
        }
    }

    /* ================= Render ================= */

    res.render("home", {
        // notifications, // NOW GLOBAL
        // pharmacySettings, // NOW GLOBAL
        activeChat,
        chatMessages,
        error: req.flash("error"),
        success: req.flash("success"),
        success: req.flash("success"),
        featuredCoupon,
        ...products,
    });
};
