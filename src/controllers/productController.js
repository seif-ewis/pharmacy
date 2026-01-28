
import db from "../config/dataBase.js";

// Get Product Details
export const getProductDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query("SELECT * FROM medicines WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            // Render 404 if product not found
            return res.status(404).render("404", { pageTitle: "Page Not Found", user: req.user });
        }

        const product = result.rows[0];

        // Use actual original_price from DB
        product.originalPrice = product.original_price;

        // Determine if it is a Service or Medicine based on category
        const isService = product.category === 'servicesProducts';

        // Fetch Related Products (same category, excluding current item)
        const relatedRes = await db.query(
            "SELECT id, name, price, image_url, icon, quantity FROM medicines WHERE category = $1 AND id != $2 ORDER BY random() LIMIT 4",
            [product.category, id]
        );
        const relatedProducts = relatedRes.rows;

        res.render("product", {
            user: req.user,
            product: product,
            isService: isService,
            relatedProducts: relatedProducts,
            pageTitle: product.name
        });

    } catch (err) {
        console.error("Get Product Details Error:", err);
        // Check for UUID syntax error which means ID is invalid -> 404
        if (err.code === '22P02') {
            return res.status(404).render("404", { pageTitle: "Page Not Found", user: req.user });
        }
        res.status(500).render("500", { pageTitle: "Server Error", user: req.user });
    }
};
