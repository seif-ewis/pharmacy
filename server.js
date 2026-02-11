import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import session from "express-session";
import passport from "./src/config/passport.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import corsOptions from "./src/config/corsOption.js";
import flash from "connect-flash";
import { RedisStore } from "connect-redis";
import redisClient from "./src/config/redis.js";
import rateLimit from "express-rate-limit";
import xss from "xss-clean";
import hpp from "hpp";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const port = process.env.PORT || 3001;

// 1. Create HTTP Server explicitly
import { createServer } from "http";
import { Server } from "socket.io";
const server = createServer(app);
const io = new Server(server);
app.set("io", io);

// So notificationController can emit notification:new without req (e.g. notifyUsersOfStock)
import { setApp as setUserNotificationApp } from "./src/utils/userNotificationEvents.js";
setUserNotificationApp(app);

// 2. Configure Session Middleware
let redisStore = new RedisStore({
    client: redisClient,
    prefix: "sess:",
});

const sessionMiddleware = session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction, // HTTPS only in production
    }
});

// 3. Apply Middleware to App
app.set("trust proxy", 1); // Must be before session for correct secure cookie behind reverse proxy
if (isProduction) {
    app.use((req, res, next) => {
        if (!req.secure) {
            return res.redirect(301, "https://" + req.get("host") + req.originalUrl);
        }
        next();
    });
}
app.use(cors(corsOptions));

// 3.1 Rate Limiting (1000 requests per 15 minutes)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for dashboard usage (polling/assets)
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter);
app.use(helmet({
    contentSecurityPolicy: false, // Disable if it breaks inline scripts/ Tailwind; tighten later if needed
    hsts: isProduction ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    } : false,
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// 3.2 Data Sanitization
app.use(xss()); // Clean XSS from user input
app.use(hpp()); // Prevent HTTP Parameter Pollution

app.use(cookieParser());
app.use(sessionMiddleware);
app.use(flash());
app.use(express.static("public"));

// 4. i18n Middleware
import i18nextMiddleware from "i18next-http-middleware";
import i18next from "./src/config/i18n.js";

app.use(i18nextMiddleware.handle(i18next));

app.use((req, res, next) => {
    // Expose t(), currentLang, and dir to all views
    // Expose t(), currentLang, and dir to all views
    res.locals.t = req.t;
    // res.locals.currentLang = req.language; 
    // res.locals.dir = req.language === 'ar' ? 'rtl' : 'ltr';

    // FORCE ENGLISH FOR NOW per user request
    res.locals.currentLang = 'en';
    res.locals.dir = 'ltr';
    // Ensure t() uses English to match
    req.i18n.changeLanguage('en');

    next();
});

// 5. Share Session with Socket.IO
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

app.set("view engine", "ejs");
app.set("views", "./view");

app.use(passport.initialize());
app.use(passport.session());


// Routes
import { globalState } from "./src/middleware/globalState.js";
app.use(globalState);

import indexRoutes from "./src/routes/indexRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import * as chatController from "./src/controllers/chatController.js"; // We need to create this

app.use("/", indexRoutes);
app.use("/auth", authRoutes);

// Socket Logic
// Socket Logic
const onlineUsers = new Set();
// Only doctor/admin are allowed to hear about online status of patients in this simple model
// or maybe we broadcast to everyone? For now, 'doctors' room receives status updates.

io.on("connection", (socket) => {
    const user = socket.request.user;

    if (user) {
        console.log(`User connected: ${user.full_name} (${user.role})`);

        // Groups
        // Check roles array (populated by deserializer)
        const roles = user.roles || [];
        const primaryRole = user.role;
        console.log(`User connected: ${user.full_name} [${roles.join(', ')}] (Primary: ${primaryRole})`);

        if (roles.includes('pharmacist') || roles.includes('admin') || roles.includes('doctor') ||
            ['pharmacist', 'admin', 'doctor'].includes(primaryRole)) {
            socket.join('doctors');
            if (roles.includes('admin') || primaryRole === 'admin') {
                socket.join('admin');
            }
            // Send current online users to this doctor
            socket.emit('online:users', Array.from(onlineUsers));
        } else {
            socket.join(`user_${user.id}`);
            onlineUsers.add(user.id);
            // Notify doctors that a user is online
            io.to('doctors').emit('user:online', { userId: user.id });
        }

        socket.on("chat message", async (msg) => {
            // Validation & Sanitization
            if (typeof msg !== 'string' || msg.trim().length === 0) return;

            // Limit length
            const cleanMsg = msg.trim().slice(0, 1000);

            console.log(`Message from ${user.full_name}: ${cleanMsg}`);

            // Save to DB
            let chatId = null;
            try {
                if (chatController.saveMessage) {
                    chatId = await chatController.saveMessage(user.id, cleanMsg);
                }
            } catch (err) {
                console.error("Failed to save chat message:", err);
                return;
            }

            // Forward to Doctors (socket.to excludes sender so they don't see their own message twice)
            socket.to('doctors').emit('chat:message', {
                chatId: chatId, // Sending the Chat UUID so the dashboard can route it
                senderId: user.id,
                senderName: user.full_name,
                message: cleanMsg,
                timestamp: new Date()
            });
        });

        socket.on("typing", () => {
            io.to('doctors').emit('user typing', { userId: user.id, userName: user.full_name });
        });

        socket.on("stop typing", () => {
            io.to('doctors').emit('user stop typing', { userId: user.id });
        });

        // Let client join extra rooms; 'admin' only for admin role (prevents accidental join by non-admins)
        socket.on('join', (room) => {
            if (!room || typeof room !== 'string') return;
            if (room === 'admin') {
                if (roles.includes('admin') || primaryRole === 'admin') socket.join(room);
                return;
            }
            socket.join(room);
        });

        socket.on("disconnect", () => {
            const roles = user.roles || [];
            const primaryRole = user.role;
            if (!roles.includes('pharmacist') && !roles.includes('admin') && !roles.includes('doctor') &&
                !['pharmacist', 'admin', 'doctor'].includes(primaryRole)) {
                onlineUsers.delete(user.id);
                io.to('doctors').emit('user:offline', { userId: user.id });
            }
        });
    }
});

app.use((req, res) => {
    res.status(404).render("404", { pageTitle: "Page Not Found", user: req.user });
});




// Scheduler for Announcements
import * as announcementController from "./src/controllers/announcementController.js";
import db from "./src/config/dataBase.js";

setInterval(async () => {
    try {
        const now = new Date();
        const res = await db.query(
            `SELECT * FROM announcements WHERE status = 'scheduled' AND scheduled_for <= $1`,
            [now]
        );

        if (res.rows.length > 0) {
            console.log(`Processing ${res.rows.length} scheduled announcements...`);
            for (const announcement of res.rows) {
                // Update status
                await db.query(`UPDATE announcements SET status = 'sent' WHERE id = $1`, [announcement.id]);

                // Broadcast
                announcementController.broadcastAnnouncement(io, announcement);
            }
        }
    } catch (err) {
        console.error("Announcement Scheduler Error:", err);
    }
}, 60000); // Check every minute

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
