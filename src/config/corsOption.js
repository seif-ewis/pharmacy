import allowedOrigins from "./origins.js";

const isProduction = process.env.NODE_ENV === "production";

// Localhost on any port - matches http(s)://localhost:3001, 127.0.0.1, [::1], with optional trailing /
const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/;

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (same-origin, server-to-server, Postman, etc.)
        if (!origin || origin === "null") return callback(null, true);

        const normalized = origin.replace(/\/+$/, ""); // trim trailing slash

        // Always allow whitelisted origins
        if (allowedOrigins.includes(normalized) || allowedOrigins.includes(origin)) return callback(null, true);

        // In development, allow localhost & 127.0.0.1 on any port (with or without trailing slash)
        if (!isProduction && localhostRegex.test(normalized)) {
            return callback(null, true);
        }

        console.warn("CORS blocked | Origin:", JSON.stringify(origin), "| Allowed:", allowedOrigins.join(", "));
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    optionsSuccessStatus: 200,
};

export default corsOptions;
