/**
 * Allowed CORS origins. In production, set ALLOWED_ORIGINS env var (comma-separated).
 * Example: ALLOWED_ORIGINS=https://mypharmacy.com,https://www.mypharmacy.com
 */
const DEFAULT_ORIGINS = [
    "https://pharmacy-btrs.onrender.com"
];

function getAllowedOrigins() {
    const env = process.env.ALLOWED_ORIGINS;
    if (env && typeof env === "string") {
        const fromEnv = env.split(",").map((o) => o.trim()).filter(Boolean);
        return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
    }
    return DEFAULT_ORIGINS;
}

const allowedOrigins = getAllowedOrigins();
export default allowedOrigins;
