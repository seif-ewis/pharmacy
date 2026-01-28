import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();


const db = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});


// Connect to database
db.connect()
    .then(() => console.log('✅ Connected to the database'))
    .catch(err => console.error('❌ Database connection error:', err));

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down database connection...");
    await db.end();
    process.exit(0);
});

export default db;