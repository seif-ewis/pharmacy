import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();


const isLocal = process.env.PG_HOST === 'localhost' || process.env.PG_HOST === '127.0.0.1';

const dbConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
};

if (!isLocal) {
    dbConfig.ssl = { rejectUnauthorized: false };
}

const db = new Pool(dbConfig);


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
