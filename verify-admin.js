import db from "./src/config/dataBase.js";

async function verifyAdmin() {
    try {
        console.log("🚀 Verifying admin@hosam.com...");
        const result = await db.query(
            "UPDATE users SET email_verified = TRUE WHERE email = $1 RETURNING id, full_name, email_verified",
            ['admin@hosam.com']
        );

        if (result.rows.length > 0) {
            console.log("✅ Admin verified successfully:", result.rows[0]);
        } else {
            console.log("⚠️ User admin@hosam.com not found in the database.");
        }
        process.exit(0);
    } catch (err) {
        console.error("❌ Verification failed:", err);
        process.exit(1);
    }
}

verifyAdmin();
