import db from "../config/dataBase.js";
import redisClient from "../config/redis.js";
// import { formatTimeAgo } from "../utils/formatDate.js"; // REFACTORED: Now in globalState middleware
import * as chatController from "./chatController.js";

export const getHomePage = async (req, res) => {

    // Define specific categories for Homepage
    const CATEGORY_SLUGS = {
        featuredMedicines: 'featured',
        dailyEssentials: 'essentials',
        wellnessProducts: 'wellness',
        servicesProducts: 'services'
    };

    const products = {
        featuredMedicines: [],
        dailyEssentials: [],
        wellnessProducts: [],
        servicesProducts: []
    };

    let featuredCoupon = null;

    try {
        const cacheKey = "homepage:products_fixed";
        const cachedProducts = await redisClient.get(cacheKey);

        if (cachedProducts) {
            const parsed = JSON.parse(cachedProducts);
            Object.assign(products, parsed);
        } else {
            const slugs = Object.values(CATEGORY_SLUGS);

            const productQuery = `
                SELECT 
                    m.id, 
                    m.name, 
                    m.description, 
                    m.price, 
                    m.original_price, 
                    m.icon, 
                    m.image_url,
                    COALESCE(ms.current_stock, 0) as quantity,
                    m.category
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) AS rn
                    FROM medicines
                    WHERE category = ANY($1) AND COALESCE(is_archived, false) = false
                ) m
                LEFT JOIN medicine_stock ms ON ms.id = m.id
                WHERE m.rn <= 10
            `;

            const result = await db.query(productQuery, [slugs]);

            // Map results to specific categories
            result.rows.forEach(row => {
                // Find which key this slug belongs to
                const key = Object.keys(CATEGORY_SLUGS).find(k => CATEGORY_SLUGS[k] === row.category);
                if (key && products[key]) {
                    products[key].push({
                        id: row.id,
                        name: row.name,
                        description: row.description,
                        price: row.price,
                        originalPrice: row.original_price,
                        icon: row.icon,
                        imageUrl: row.image_url,
                        stock: row.quantity
                    });
                }
            });

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
                    await redisClient.setEx(couponCacheKey, 300, JSON.stringify(featuredCoupon));
                }
            }
        } catch (err) {
            console.error("Error fetching featured coupon:", err);
            // Non-critical, continue without coupon
        }

    } catch (err) {
        console.error("Homepage products error:", err);
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
        featuredCoupon,
        featuredMedicines: products.featuredMedicines,
        dailyEssentials: products.dailyEssentials,
        wellnessProducts: products.wellnessProducts,
        servicesProducts: products.servicesProducts
    });
};
