import db from "../config/dataBase.js";

export const searchMedicines = async (req, res) => {
    const query = req.query.q || "";

    if (!query.trim()) {
        return res.redirect("/");
    }

    try {
        const result = await db.query(
            `SELECT id, name, description, price, icon, quantity, category
             FROM medicines
             WHERE name ILIKE $1 OR description ILIKE $1
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
