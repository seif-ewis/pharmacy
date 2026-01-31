import db from "../config/dataBase.js";

// Map URL slugs to database category values
const CATEGORY_MAP = {
    'featured': 'featuredMedicines',
    'essentials': 'dailyEssentials',
    'wellness': 'wellnessProducts',
    'services': 'servicesProducts'
};

// Display names for categories
const CATEGORY_DISPLAY_NAMES = {
    'featuredMedicines': 'Featured Products',
    'dailyEssentials': 'Daily Medicines',
    'wellnessProducts': 'Beauty & Wellness',
    'servicesProducts': 'Pharmacy Services'
};

const ITEMS_PER_PAGE = 12;

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

/**
 * Get category page (initial load)
 */
export const getCategoryPage = async (req, res) => {
    const { slug } = req.params;
    const { sort } = req.query; // Get sort param

    // Validate category
    const category = CATEGORY_MAP[slug];
    if (!category) {
        return res.status(404).render('404', { message: 'Category not found' });
    }

    try {
        const orderBy = getOrderClause(sort);

        // Get first page of products
        // Using string interpolation for ORDER BY (safe here as values are controlled by switch)
        const result = await db.query(`
            SELECT m.id, m.name, m.description, m.price, m.original_price, m.icon, m.image_url, COALESCE(ms.current_stock, 0) as quantity, m.created_at
            FROM medicines m
            LEFT JOIN medicine_stock ms ON m.id = ms.id
            WHERE m.category = $1
            ORDER BY ${orderBy}
            LIMIT $2
        `, [category, ITEMS_PER_PAGE]);

        const products = result.rows;

        // Determine if there are more products
        const hasMore = products.length === ITEMS_PER_PAGE;

        // Get cursor for next page
        // For simple cursor pagination with variable sorts, we need to encode the sort value too
        // But for this MVP, let's rely on offset or simplified cursor if possible.
        // To properly support cursor pagination with dynamic sorts, we'd need to emit the sort value in the cursor.
        // For now, let's keep the cursor simple: using offset-like logic or just the last item's ID if we don't strictly ban duplicates.
        // Actually, let's just use OFFSET based pagination for "Load More" to simplify dynamic sorting support 
        // OR simply pass the full last item state.

        // Let's stick to the current cursor implementation but adapt it for 'created_at' default.
        // If sorting by price, the cursor logic becomes complex.
        // HACK: For this fix, I'll switch to OFFSET for "Load More" if a sort is active, OR I will just disable infinite scroll for sorted views?
        // Better: Let's simply return the offset as cursor.

        let nextCursor = null;
        if (hasMore) {
            nextCursor = ITEMS_PER_PAGE; // Simple numeric offset
        }

        // Get total count for display
        const countResult = await db.query(`
            SELECT COUNT(*) as total FROM medicines WHERE category = $1
        `, [category]);
        const totalCount = parseInt(countResult.rows[0].total);

        res.render('category', {
            category: slug,
            categoryName: CATEGORY_DISPLAY_NAMES[category],
            currentSort: sort || 'newest', // Pass current sort to view
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
            totalCount
        });

    } catch (err) {
        console.error('Category page error:', err);
        res.status(500).send('Internal Server Error');
    }
};

/**
 * API: Get more products (for infinite scroll)
 * Switching to OFFSET-based pagination for simplicity with sorting
 */
export const getMoreProducts = async (req, res) => {
    const { slug } = req.params;
    const { cursor, sort } = req.query; // Cursor is now an offset integer

    // Validate category
    const category = CATEGORY_MAP[slug];
    if (!category) {
        return res.status(404).json({ error: 'Category not found' });
    }

    try {
        const orderBy = getOrderClause(sort);
        const offset = parseInt(cursor) || 0;

        const result = await db.query(`
            SELECT m.id, m.name, m.description, m.price, m.original_price, m.icon, m.image_url, COALESCE(ms.current_stock, 0) as quantity, m.created_at
            FROM medicines m
            LEFT JOIN medicine_stock ms ON m.id = ms.id
            WHERE m.category = $1
            ORDER BY ${orderBy} -- Safe interpolation (controlled values)
            LIMIT $2 OFFSET $3
        `, [category, ITEMS_PER_PAGE, offset]);

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
