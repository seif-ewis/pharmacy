import db from "../config/dataBase.js";
import redisClient from "../config/redis.js";

export const searchMedicines = async (req, res) => {
    const query = req.query.q || "";

    if (!query.trim()) {
        return res.redirect("/");
    }

    try {
        const cacheKey = `search:${query.toLowerCase().trim()}`;
        const cachedResults = await redisClient.get(cacheKey);

        if (cachedResults) {
            const medicines = JSON.parse(cachedResults);
            if (req.xhr || req.headers.accept.includes('application/json') || req.query.ajax) {
                return res.json({ medicines });
            }
            return res.render("searchResults", { query, medicines, user: req.user || null });
        }

        const result = await db.query(
            `SELECT 
                m.id, m.name, m.description, m.price, m.icon, m.category,
                COALESCE(ms.current_stock, 0) as quantity
             FROM medicines m
             LEFT JOIN medicine_stock ms ON ms.id = m.id
             WHERE m.name ILIKE $1 OR m.description ILIKE $1
             LIMIT 50`,
            [`%${query}%`]
        );

        const medicines = result.rows;

        // Cache for 60 seconds
        await redisClient.setEx(cacheKey, 60, JSON.stringify(medicines));

        if (req.xhr || req.headers.accept.includes('application/json') || req.query.ajax) {
            return res.json({ medicines });
        }

        res.render("searchResults", {
            query,
            medicines,
            user: req.user || null
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).send("Internal Server Error");
    }
};
