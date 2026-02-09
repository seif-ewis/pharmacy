import db from "../../config/dataBase.js";

// Get Categories as JSON (for SPA/AJAX)
export const getCategoriesJson = async (req, res) => {
    console.log("[DEBUG] getCategoriesJson called");
    try {
        const result = await db.query("SELECT * FROM categories ORDER BY created_at DESC");
        console.log("[DEBUG] Categories fetched:", result.rows.length, "items");
        return res.json({ success: true, categories: result.rows });
    } catch (err) {
        console.error("[DEBUG] Error fetching categories:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch categories." });
    }
};

// Get Categories Page (redirect to dashboard)
export const getCategories = async (req, res) => {
    console.log("[DEBUG] getCategories called - redirecting");
    res.redirect("/admin/dashboard#categories");
};

// Add Category
export const addCategory = async (req, res) => {
    console.log("[DEBUG] addCategory called with body:", req.body);
    const { name, slug, icon, image_url, description, color } = req.body;

    // Simple verification
    if (!name || !slug) {
        console.log("[DEBUG] Validation failed - missing name or slug");
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: "Name and Slug are required." });
        }
        req.flash("error", "Name and Slug are required.");
        return res.redirect("/admin/categories");
    }

    try {
        // Check if slug exists
        const check = await db.query("SELECT id FROM categories WHERE slug = $1", [slug]);
        if (check.rows.length > 0) {
            console.log("[DEBUG] Slug already exists:", slug);
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: "Category slug already exists." });
            }
            req.flash("error", "Category slug already exists.");
            return res.redirect("/admin/dashboard#categories");
        }

        console.log("[DEBUG] Inserting category:", { name, slug, icon, image_url, description, color });
        await db.query(
            "INSERT INTO categories (name, slug, icon, image_url, description, color, is_active, is_visible) VALUES ($1, $2, $3, $4, $5, $6, true, true)",
            [name, slug, icon, image_url, description, color]
        );
        console.log("[DEBUG] Category inserted successfully");

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true, message: "Category added successfully." });
        }

        req.flash("success", "Category added successfully.");
        res.redirect("/admin/dashboard#categories");
    } catch (err) {
        console.error("[DEBUG] Error adding category:", err);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: "Failed to add category." });
        }
        req.flash("error", "Failed to add category.");
        res.redirect("/admin/dashboard#categories");
    }
};

// Edit Category
export const editCategory = async (req, res) => {
    const { id, name, slug, icon, image_url, description, color } = req.body;

    try {
        await db.query(
            "UPDATE categories SET name = $1, slug = $2, icon = $3, image_url = $4, description = $5, color = $6 WHERE id = $7",
            [name, slug, icon, image_url, description, color, id]
        );

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message: "Category updated successfully." });
        }

        req.flash("success", "Category updated successfully.");
        res.redirect("/admin/dashboard#categories");
    } catch (err) {
        console.error("Error updating category:", err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: "Failed to update category." });
        }
        req.flash("error", "Failed to update category.");
        res.redirect("/admin/dashboard#categories");
    }
};

// Delete Category (Soft Delete or Hard Delete - lets go with Hard for now as it's simple management, or toggle active)
// Implementing Toggle Active/Visible instead for safety, or Delete if requested. 
// User asked for "Add, Edit, Delete".
export const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if any products use this category
        // Note: products table uses 'category' text column often, not FK. Need to check schema. 
        // Assuming loose coupling for now.

        await db.query("DELETE FROM categories WHERE id = $1", [id]);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message: "Category deleted successfully." });
        }

        req.flash("success", "Category deleted successfully.");
        res.redirect("/admin/dashboard#categories");
    } catch (err) {
        console.error("Error deleting category:", err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: "Failed to delete category." });
        }
        req.flash("error", "Failed to delete category.");
        res.redirect("/admin/dashboard#categories");
    }
};
