import db from "./src/config/dataBase.js";

async function migrate() {
    try {
        console.log("🚀 Starting email verification migration...");

        await db.query(`
            -- Add email_verified to users if not exists
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='email_verified') THEN
                    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;

            -- Create email_verifications table
            CREATE TABLE IF NOT EXISTS email_verifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                otp_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
        `);

        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
