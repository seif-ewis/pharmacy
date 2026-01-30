/**
 * Fix Missing Stock Script
 * 
 * This script identifies products that show 0 stock in medicine_stock VIEW
 * but have no inventory_adjustments (likely missed during initial migration)
 * and gives them a default initial stock of 50.
 */

import db from '../src/config/dataBase.js';

const DEFAULT_INITIAL_STOCK = 50;

async function fixMissingStock() {
    console.log('🔍 Analyzing products with missing stock...\n');

    try {
        // Find products with 0 stock and no adjustments
        const result = await db.query(`
            SELECT 
                m.id, 
                m.name, 
                m.category,
                COALESCE(ms.current_stock, 0) as current_stock,
                (SELECT COUNT(*) FROM inventory_adjustments ia WHERE ia.medicine_id = m.id) as adjustment_count
            FROM medicines m
            LEFT JOIN medicine_stock ms ON ms.id = m.id
            WHERE (ms.current_stock <= 0 OR ms.current_stock IS NULL)
            ORDER BY m.category, m.name
        `);

        if (result.rows.length === 0) {
            console.log('✅ All products have stock records! No fixes needed.');
            process.exit(0);
        }

        console.log(`Found ${result.rows.length} products with 0 or missing stock:\n`);
        console.log('Name'.padEnd(35) + 'Category'.padEnd(25) + 'Stock'.padEnd(10) + 'Adjustments');
        console.log('-'.repeat(80));

        // Separate into those needing fix vs those truly at 0
        const needsFix = [];
        const trulyOutOfStock = [];

        for (const row of result.rows) {
            const line = `${row.name.substring(0, 33).padEnd(35)}${(row.category || 'N/A').substring(0, 23).padEnd(25)}${String(row.current_stock).padEnd(10)}${row.adjustment_count}`;
            console.log(line);

            if (parseInt(row.adjustment_count) === 0) {
                needsFix.push(row);
            } else {
                trulyOutOfStock.push(row);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log(`📊 Summary:`);
        console.log(`   - Products with 0 adjustments (NEED FIX): ${needsFix.length}`);
        console.log(`   - Products with adjustments but 0 stock (TRULY OUT): ${trulyOutOfStock.length}`);

        if (needsFix.length === 0) {
            console.log('\n✅ All products with 0 stock have adjustment records. They are truly out of stock.');
            process.exit(0);
        }

        // Get admin/doctor user for attribution
        const userRes = await db.query(`
            SELECT u.id FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE r.name IN ('admin', 'doctor')
            LIMIT 1
        `);

        if (userRes.rows.length === 0) {
            console.error('❌ No admin/doctor user found for attribution!');
            process.exit(1);
        }

        const performedBy = userRes.rows[0].id;

        console.log(`\n🔧 Adding initial_stock adjustment (${DEFAULT_INITIAL_STOCK} units) for ${needsFix.length} products...`);

        let fixed = 0;
        for (const product of needsFix) {
            await db.query(`
                INSERT INTO inventory_adjustments 
                (medicine_id, adjustment_type, quantity_change, performed_by, reason)
                VALUES ($1, 'initial_stock', $2, $3, $4)
            `, [
                product.id,
                DEFAULT_INITIAL_STOCK,
                performedBy,
                'Auto-fix: Initial stock for product missing adjustment records'
            ]);
            fixed++;
            console.log(`   ✓ ${product.name}`);
        }

        console.log(`\n✅ Fixed ${fixed} products with initial stock of ${DEFAULT_INITIAL_STOCK} units each.`);
        console.log('🔄 The home page will now show these products as available!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixMissingStock();
