import db from "../src/config/dataBase.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    try {
        const sqlPath = path.join(__dirname, "../database/migration_coupon_message.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");

        console.log("Running custom_message migration...");
        await db.query(sql);
        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

runMigration();
