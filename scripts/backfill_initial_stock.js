/**
 * Backfill Initial Stock Migration
 * 
 * This script finds all medicines with negative stock (due to missing initial adjustments)
 * and creates a 'migration_balance' adjustment to bring them to their correct level.
 * 
 * It reads the deprecated quantity_deprecated column (if it exists) or uses 0 as baseline.
 */

import db from '../src/config/dataBase.js';

async function backfillInitialStock() {
    const client = await db.connect();
    try {
        console.log('🔄 Starting stock backfill migration...\n');

        await client.query('BEGIN');

        // 1. Find all medicines with their current calculated stock and old quantity
        console.log('1️⃣ Finding medicines with stock discrepancies...\n');

        const discrepancyResult = await client.query(`
            SELECT 
                m.id,
                m.name,
                COALESCE(m.quantity_deprecated, 0) as old_quantity,
                COALESCE(
                    (SELECT SUM(quantity_change) FROM inventory_adjustments WHERE medicine_id = m.id),
                    0
                ) as calculated_stock
            FROM medicines m
        `);

        const medicines = discrepancyResult.rows;
        console.log(`Found ${medicines.length} medicines to check\n`);

        let fixedCount = 0;
        let skippedCount = 0;

        for (const med of medicines) {
            const oldQty = parseInt(med.old_quantity) || 0;
            const calcStock = parseInt(med.calculated_stock) || 0;

            // If calculated stock matches old quantity, skip
            if (calcStock === oldQty) {
                skippedCount++;
                continue;
            }

            // Calculate adjustment needed
            // If old quantity was 50 and calculated is -5, we need to add 55
            // If old quantity was 50 and calculated is 10, we need to add 40
            const adjustmentNeeded = oldQty - calcStock;

            if (adjustmentNeeded === 0) {
                skippedCount++;
                continue;
            }

            console.log(`📦 ${med.name}:`);
            console.log(`   Old Quantity: ${oldQty}`);
            console.log(`   Calculated Stock: ${calcStock}`);
            console.log(`   Adjustment Needed: ${adjustmentNeeded > 0 ? '+' : ''}${adjustmentNeeded}`);

            // Insert migration adjustment using 'initial_stock' type
            await client.query(`
                INSERT INTO inventory_adjustments 
                (medicine_id, adjustment_type, quantity_change, performed_by, reason, shift_id)
                VALUES ($1, 'initial_stock', $2, NULL, $3, NULL)
            `, [
                med.id,
                adjustmentNeeded,
                `Migration backfill: Syncing from legacy quantity (${oldQty}) to adjustment-based system`
            ]);

            console.log(`   ✅ Created adjustment of ${adjustmentNeeded > 0 ? '+' : ''}${adjustmentNeeded}\n`);
            fixedCount++;
        }

        await client.query('COMMIT');

        console.log('\n🎉 Migration completed!');
        console.log(`   ✅ Fixed: ${fixedCount} medicines`);
        console.log(`   ⏭️  Skipped (already correct): ${skippedCount} medicines`);

        // Verify final state
        console.log('\n📊 Final Verification:');
        const verifyResult = await client.query(`
            SELECT 
                m.name,
                COALESCE(ms.current_stock, 0) as final_stock,
                COALESCE(m.quantity_deprecated, 0) as expected
            FROM medicines m
            LEFT JOIN medicine_stock ms ON ms.id = m.id
            WHERE COALESCE(ms.current_stock, 0) < 0
            LIMIT 10
        `);

        if (verifyResult.rows.length === 0) {
            console.log('   ✅ No negative stock remaining!');
        } else {
            console.log('   ⚠️  Still have negative stock:');
            verifyResult.rows.forEach(row => {
                console.log(`      - ${row.name}: ${row.final_stock}`);
            });
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await db.end();
    }
}

backfillInitialStock()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Error:', err);
        process.exit(1);
    });
