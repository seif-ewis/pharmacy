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

/**
 * Get category page (initial load)
 */
export const getCategoryPage = async (req, res) => {
    const { slug } = req.params;

    // Validate category
    const category = CATEGORY_MAP[slug];
    if (!category) {
        return res.status(404).render('404', { message: 'Category not found' });
    }

    try {
        // Get first page of products
        const result = await db.query(`
            SELECT id, name, description, price, original_price, icon, image_url, quantity, created_at
            FROM medicines
            WHERE category = $1
            ORDER BY created_at DESC, id DESC
            LIMIT $2
        `, [category, ITEMS_PER_PAGE]);

        const products = result.rows;

        // Determine if there are more products
        const hasMore = products.length === ITEMS_PER_PAGE;

        // Get cursor for next page (last item's created_at + id)
        let nextCursor = null;
        if (hasMore && products.length > 0) {
            const lastItem = products[products.length - 1];
            nextCursor = Buffer.from(JSON.stringify({
                created_at: lastItem.created_at,
                id: lastItem.id
            })).toString('base64');
        }

        // Get total count for display
        const countResult = await db.query(`
            SELECT COUNT(*) as total FROM medicines WHERE category = $1
        `, [category]);
        const totalCount = parseInt(countResult.rows[0].total);

        res.render('category', {
            category: slug,
            categoryName: CATEGORY_DISPLAY_NAMES[category],
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
 * Uses cursor-based pagination for consistent ordering
 */
export const getMoreProducts = async (req, res) => {
    const { slug } = req.params;
    const { cursor } = req.query;

    // Validate category
    const category = CATEGORY_MAP[slug];
    if (!category) {
        return res.status(404).json({ error: 'Category not found' });
    }

    try {
        let query;
        let params;

        if (cursor) {
            // Decode cursor
            const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));

            // Cursor-based pagination: get items AFTER the cursor position
            // Using (created_at, id) tuple for stable ordering
            query = `
                SELECT id, name, description, price, original_price, icon, image_url, quantity, created_at
                FROM medicines
                WHERE category = $1
                  AND (created_at, id) < ($2::timestamp, $3::uuid)
                ORDER BY created_at DESC, id DESC
                LIMIT $4
            `;
            params = [category, cursorData.created_at, cursorData.id, ITEMS_PER_PAGE];
        } else {
            // First page (no cursor)
            query = `
                SELECT id, name, description, price, original_price, icon, image_url, quantity, created_at
                FROM medicines
                WHERE category = $1
                ORDER BY created_at DESC, id DESC
                LIMIT $2
            `;
            params = [category, ITEMS_PER_PAGE];
        }

        const result = await db.query(query, params);
        const products = result.rows;

        // Determine if there are more products
        const hasMore = products.length === ITEMS_PER_PAGE;

        // Generate next cursor
        let nextCursor = null;
        if (hasMore && products.length > 0) {
            const lastItem = products[products.length - 1];
            nextCursor = Buffer.from(JSON.stringify({
                created_at: lastItem.created_at,
                id: lastItem.id
            })).toString('base64');
        }

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
