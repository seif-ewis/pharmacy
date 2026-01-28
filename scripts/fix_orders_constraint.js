import db from '../src/config/dataBase.js';

const fixConstraint = async () => {
    try {
        console.log('🔄 Fixing database constraint...');

        // 1. Drop existing constraint
        await db.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;`);
        console.log('✅ Dropped old constraint');

        // 2. Add new constraint with 'canceled' and 'cancelled'
        // Using raw SQL for the array logic matching the error message style
        const constraintQuery = `
            ALTER TABLE orders 
            ADD CONSTRAINT orders_status_check 
            CHECK (status::text = ANY (ARRAY[
                'pending'::character varying, 
                'scheduled'::character varying, 
                'approved'::character varying, 
                'preparing'::character varying, 
                'shipped'::character varying, 
                'delivered'::character varying, 
                'canceled'::character varying, 
                'cancelled'::character varying
            ]::text[]));
        `;
        await db.query(constraintQuery);
        console.log('✅ Added new constraint with canceled/cancelled status');

    } catch (error) {
        console.error('❌ Error fixing constraint:', error);
    } finally {
        // We need to close the pool to exit
        // db export is a Pool instance
        await db.end();
        process.exit();
    }
};

fixConstraint();
