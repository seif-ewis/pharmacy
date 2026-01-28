import allowedOrigins from "./origins.js";

const corsOptions = {
    origin: (origin, callback) => {
        // delete the !origin check in production
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

export default corsOptions;
