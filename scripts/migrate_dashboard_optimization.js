import db from "../src/config/dataBase.js";

async function runMigration() {
    try {
        console.log("--- Starting Dashboard Optimization Sync ---");

        // 1. Sync counts
        console.log("Syncing existing order counts...");
        await db.query(`
            UPDATE users 
            SET total_orders_placed = (
                SELECT COUNT(*) FROM orders WHERE user_id = users.id
            )
        `);
        console.log("✅ Counts synced.");

        // 2. Setup Trigger
        console.log("Setting up automated triggers...");
        await db.query(`
            CREATE OR REPLACE FUNCTION sync_user_order_count() 
            RETURNS TRIGGER AS '
            BEGIN
                IF (TG_OP = ''INSERT'') THEN
                    UPDATE users SET total_orders_placed = total_orders_placed + 1 WHERE id = NEW.user_id;
                ELSIF (TG_OP = ''DELETE'') THEN
                    UPDATE users SET total_orders_placed = total_orders_placed - 1 WHERE id = OLD.user_id;
                END IF;
                RETURN NULL;
            END;
            ' LANGUAGE plpgsql;
        `);

        await db.query(`
            DROP TRIGGER IF EXISTS trg_sync_order_count ON orders;
            CREATE TRIGGER trg_sync_order_count
            AFTER INSERT OR DELETE ON orders
            FOR EACH ROW EXECUTE FUNCTION sync_user_order_count();
        `);
        console.log("✅ Triggers established.");

        console.log("--- Migration Complete ---");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

runMigration();
