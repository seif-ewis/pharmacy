import db from "../config/dataBase.js";

const ITEMS_PER_PAGE = 12;

// Consistent colors for categories (cycle through them)
const COLORS = [
    'text-orange-500 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white',
    'text-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white',
    'text-purple-500 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white',
    'text-teal-500 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white',
    'text-pink-500 bg-pink-50 dark:bg-pink-500/10 dark:text-pink-400 group-hover:bg-pink-500 group-hover:text-white',
    'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
];

// Helper to determine order clause
const getOrderClause = (sort) => {
    switch (sort) {
        case 'price-low': return 'price ASC, id DESC';
        case 'price-high': return 'price DESC, id DESC';
        case 'name': return 'name ASC, id DESC';
        case 'newest':
        default: return 'created_at DESC, id DESC';
    }
};

export const getAllCategoriesPage = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories WHERE is_visible = true AND is_active = true ORDER BY display_order ASC');

        const categories = result.rows.map((cat, index) => ({
            ...cat,
            color: COLORS[index % COLORS.length]
        }));

        res.render('categories', {
            title: 'All Categories',
            categories,
            user: req.user
        });
    } catch (err) {
        console.error("Error fetching categories:", err);
        // Assuming 500 template exists or error handler middleware catches it. 
        // For now, render error if possible or basic message.
        res.status(500).send("Internal Server Error");
    }
};

/**
 * Get category page (initial load)
 */
export const getCategoryPage = async (req, res) => {
    const { slug } = req.params;
    const { sort } = req.query;

    try {
        // Validate category
        const catRes = await db.query('SELECT * FROM categories WHERE slug = $1 AND is_active = true', [slug]);

        if (catRes.rows.length === 0) {
            return res.status(404).render('404', { message: 'Category not found' });
        }

        const category = catRes.rows[0];
        const orderBy = getOrderClause(sort);

        const result = await db.query(`
            SELECT m.id, m.name, m.description, m.price, m.original_price, m.icon, m.image_url, COALESCE(ms.current_stock, 0) as quantity, m.created_at
            FROM medicines m
            LEFT JOIN medicine_stock ms ON m.id = ms.id
            WHERE m.category = $1
            ORDER BY ${orderBy}
            LIMIT $2
        `, [slug, ITEMS_PER_PAGE]);

        const products = result.rows;
        const hasMore = products.length === ITEMS_PER_PAGE;
        let nextCursor = hasMore ? ITEMS_PER_PAGE : null;

        // Get total count
        const countResult = await db.query(`
            SELECT COUNT(*) as total FROM medicines WHERE category = $1
        `, [slug]);
        const totalCount = parseInt(countResult.rows[0].total);

        res.render('category', {
            category: slug,
            categoryName: category.name,
            currentSort: sort || 'newest',
            products: products.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                originalPrice: p.original_price,
                icon: p.icon,
                imageUrl: p.image_url,
                stock: p.quantity
            })),
            hasMore,
            nextCursor,
            totalCount,
            user: req.user
        });

    } catch (err) {
        console.error("Category page error:", err);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * API: Get more products (for infinite scroll)
 */
export const getMoreProducts = async (req, res) => {
    const { slug } = req.params;
    const { cursor, sort } = req.query;

    try {
        // Validate category
        const catRes = await db.query('SELECT 1 FROM categories WHERE slug = $1 AND is_active = true', [slug]);
        if (catRes.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const orderBy = getOrderClause(sort);
        const offset = parseInt(cursor) || 0;

        const result = await db.query(`
            SELECT m.id, m.name, m.description, m.price, m.original_price, m.icon, m.image_url, COALESCE(ms.current_stock, 0) as quantity, m.created_at
            FROM medicines m
            LEFT JOIN medicine_stock ms ON m.id = ms.id
            WHERE m.category = $1
            ORDER BY ${orderBy} 
            LIMIT $2 OFFSET $3
        `, [slug, ITEMS_PER_PAGE, offset]);

        const products = result.rows;
        const hasMore = products.length === ITEMS_PER_PAGE;
        const nextCursor = hasMore ? (offset + ITEMS_PER_PAGE) : null;

        res.json({
            success: true,
            products: products.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                originalPrice: p.original_price,
                icon: p.icon,
                imageUrl: p.image_url,
                stock: p.quantity
            })),
            hasMore,
            nextCursor
        });

    } catch (err) {
        console.error('Get more products error:', err);
        res.status(500).json({ error: 'Failed to load products' });
    }
};
