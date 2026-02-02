import db from "./src/config/dataBase.js";

const migrate = async () => {
    try {
        console.log("🚀 Starting password_resets migration...");

        await db.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            
            CREATE TABLE IF NOT EXISTS password_resets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                otp_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                attempts INTEGER DEFAULT 0,
                reset_token TEXT,
                token_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
            CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
        `);

        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrate();
