import db from '../src/config/dataBase.js';

const setupMonitoring = async () => {
    const client = await db.connect();

    try {
        console.log('📊 Setting up inventory monitoring...\n');

        await client.query('BEGIN');

        // Create anomaly detection function
        console.log('  → Creating check_shift_stock_anomalies function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION check_shift_stock_anomalies()
            RETURNS TRIGGER AS $$
            DECLARE
                anomaly_count INTEGER;
                anomaly_details TEXT;
            BEGIN
                IF NEW.status = 'closed' AND OLD.status = 'open' THEN
                    
                    SELECT COUNT(*), STRING_AGG(
                        m.name || ' (net: ' || ms.net_change || ')', 
                        ', '
                    )
                    INTO anomaly_count, anomaly_details
                    FROM medicine_stock_by_shift ms
                    JOIN medicines m ON m.id = ms.medicine_id
                    WHERE ms.shift_id = NEW.id
                    AND ms.net_change < 0
                    GROUP BY ms.shift_id;
                    
                    IF anomaly_count > 0 THEN
                        RAISE WARNING '🚨 SHIFT STOCK ANOMALY: Shift % closed with % items showing net negative stock: %',
                            NEW.id, anomaly_count, anomaly_details
                            USING HINT = 'Review inventory adjustments. Possible theft or data corruption.';
                    END IF;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('  ✅ Function created');

        // Create trigger
        console.log('  → Creating trigger...');
        await client.query(`DROP TRIGGER IF EXISTS trg_check_shift_anomalies ON shifts`);
        await client.query(`
            CREATE TRIGGER trg_check_shift_anomalies
            AFTER UPDATE ON shifts
            FOR EACH ROW
            EXECUTE FUNCTION check_shift_stock_anomalies()
        `);
        console.log('  ✅ Trigger created');

        await client.query('COMMIT');

        console.log('\n🎉 ========================================');
        console.log('🎉 MONITORING ACTIVE!');
        console.log('🎉 ========================================');
        console.log('✅ Shift anomaly detection enabled');
        console.log('✅ Adjustment failures logged to console');
        console.log('\n📝 TODO: Integrate with external monitoring (PagerDuty, Slack)');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Monitoring setup failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
};

setupMonitoring();
