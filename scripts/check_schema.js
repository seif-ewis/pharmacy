import db from '../src/config/dataBase.js';

const diagnose = async () => {
    const client = await db.connect();

    try {
        console.log('🔍 Diagnosing migration issue...\n');

        // Check current column type
        const col = await client.query(`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = 'inventory_adjustments' 
            AND column_name = 'adjustment_type'
        `);
        console.log('Current column info:');
        console.table(col.rows);

        // Check if ENUM exists
        const enumType = await client.query(`
            SELECT typname, typcategory FROM pg_type WHERE typname = 'adjustment_type_enum'
        `);
        console.log('\nENUM type exists:', enumType.rows.length > 0);
        if (enumType.rows.length > 0) {
            console.table(enumType.rows);
        }

        // Check all views
        const views = await client.query(`
            SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
        `);
        console.log('\nAll views:');
        console.table(views.rows);

        // Check view dependencies
        const deps = await client.query(`
            SELECT DISTINCT
                dependent_ns.nspname as dependent_schema,
                dependent_view.relname as dependent_view, 
                source_ns.nspname as source_schema,
                source_table.relname as source_table,
                pg_attribute.attname as column_name
            FROM pg_depend 
            JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
            JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
            JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
            JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid 
                AND pg_depend.refobjsubid = pg_attribute.attnum 
            JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
            JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
            WHERE source_table.relname = 'inventory_adjustments'
            AND pg_attribute.attnum > 0
            AND pg_attribute.attname = 'adjustment_type'
        `);
        console.log('\nDependencies on inventory_adjustments.adjustment_type:');
        console.table(deps.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        client.release();
    }
};

diagnose();
