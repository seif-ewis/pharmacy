import db from "../config/dataBase.js";

export const searchMedicines = async (req, res) => {
    const query = req.query.q || "";

    if (!query.trim()) {
        return res.redirect("/");
    }

    try {
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

        if (req.xhr || req.headers.accept.includes('application/json') || req.query.ajax) {
            return res.json({ medicines: result.rows });
        }

        res.render("searchResults", {
            query,
            medicines: result.rows,
            user: req.user || null
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).send("Internal Server Error");
    }
};
