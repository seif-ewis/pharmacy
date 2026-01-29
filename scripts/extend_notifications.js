import db from '../src/config/dataBase.js';

console.log('🔔 Extending notifications table for announcements ownership...\n');

try {
    console.log('Step 1: Adding sender_id column...');
    await db.query(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id);
    `);
    console.log('✅ sender_id added\n');

    console.log('Step 2: Adding scope column...');
    await db.query(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'global' 
        CHECK (scope IN ('global', 'users', 'staff'));
    `);
    console.log('✅ scope added\n');

    console.log('Step 3: Creating index on sender_id...');
    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_sender 
        ON notifications(sender_id);
    `);
    console.log('✅ Index created\n');

    console.log('Step 4: Creating index on scope...');
    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_scope 
        ON notifications(scope);
    `);
    console.log('✅ Index created\n');

    console.log('🎉 Notifications table extended successfully!');
    console.log('\n📊 New columns:');
    console.log('   - sender_id: UUID (FK to users)');
    console.log('   - scope: VARCHAR(20) (global | users | staff)');

    process.exit(0);
} catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
}
