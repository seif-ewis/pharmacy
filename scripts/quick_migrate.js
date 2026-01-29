import db from '../src/config/dataBase.js';

console.log('Starting simple migration...\n');

try {
    console.log('Step 1: Creating order_status_logs table...');
    await db.query(`
        CREATE TABLE IF NOT EXISTS order_status_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            old_status VARCHAR(50),
            new_status VARCHAR(50) NOT NULL,
            changed_by UUID NOT NULL REFERENCES users(id),
            changed_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_order_status_logs_order ON order_status_logs(order_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_order_status_logs_date ON order_status_logs(changed_at DESC);`);
    console.log('✅ order_status_logs created\n');

    console.log('Step 2: Backing up shifts...');
    const shifts = await db.query('SELECT * FROM shifts');
    console.log(`Found ${shifts.rows.length} shifts\n`);

    console.log('Step 3: Dropping and recreating shifts table...');
    await db.query('DROP TABLE IF EXISTS shifts CASCADE');
    await db.query(`
        CREATE TABLE shifts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            opened_by UUID NOT NULL REFERENCES users(id),
            closed_by UUID REFERENCES users(id),
            opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
            closed_at TIMESTAMP,
            total_orders INTEGER DEFAULT 0,
            total_prescriptions INTEGER DEFAULT 0,
            total_returns INTEGER DEFAULT 0,
            gross_revenue NUMERIC(10,2) DEFAULT 0.00,
            net_revenue NUMERIC(10,2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed'))
        );
    `);
    await db.query('CREATE INDEX idx_shifts_status ON shifts(status)');
    await db.query('CREATE INDEX idx_shifts_opened_by ON shifts(opened_by)');
    console.log('✅ shifts table recreated\n');

    console.log('Step 4: Migrating shifts data...');
    for (const s of shifts.rows) {
        await db.query(`
            INSERT INTO shifts (id, opened_by, closed_by, opened_at, closed_at, total_orders, total_prescriptions, gross_revenue, net_revenue, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [s.id, s.doctor_id, s.is_active ? null : s.doctor_id, s.start_at, s.end_at, s.orders_count || 0, s.prescriptions_count || 0, s.total_revenue || 0, s.total_revenue || 0, s.is_active ? 'open' : 'closed']);
    }
    console.log(`✅ Migrated ${shifts.rows.length} shifts\n`);

    console.log('Step 5: Adding shift_id to orders...');
    await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id)');
    console.log('✅ shift_id added to orders\n');

    console.log('Step 6: Adding shift_id to returns...');
    await db.query('ALTER TABLE returns ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_returns_shift ON returns(shift_id)');
    console.log('✅ shift_id added to returns\n');

    console.log('Step 7: Adding shift_id to payments...');
    await db.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_shift ON payments(shift_id)');
    console.log('✅ shift_id added to payments\n');

    console.log('Step 8: Backfilling order status logs...');
    const orders = await db.query('SELECT id, status, user_id, created_at FROM orders ORDER BY created_at');
    for (const o of orders.rows) {
        await db.query('INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, changed_at) VALUES ($1, NULL, $2, $3, $4)',
            [o.id, o.status, o.user_id, o.created_at]);
    }
    console.log(`✅ Created logs for ${orders.rows.length} orders\n`);

    console.log('\n🎉 Migration complete!');
    process.exit(0);
} catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
}
