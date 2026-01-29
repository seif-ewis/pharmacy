import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import session from "express-session";
import passport from "./src/config/passport.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import corsOptions from "./src/config/corsOption.js";
import flash from "connect-flash";

dotenv.config();

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

// 2. Configure Session Middleware
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    }
});

// 3. Apply Middleware to App
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(flash());
app.use(express.static("public"));

// 4. Share Session with Socket.IO
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
        if (user.role === 'pharmacist' || user.role === 'admin' || user.role === 'doctor') {
            socket.join('doctors');
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
            try {
                if (chatController.saveMessage) {
                    await chatController.saveMessage(user.id, cleanMsg);
                }
            } catch (err) {
                console.error("Failed to save chat message:", err);
                return;
            }

            // Forward to Doctors
            // We include properties to help UI: userId, userName
            io.to('doctors').emit('chat:message', {
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

        socket.on("disconnect", () => {
            if (user.role !== 'pharmacist' && user.role !== 'admin' && user.role !== 'doctor') {
                onlineUsers.delete(user.id);
                io.to('doctors').emit('user:offline', { userId: user.id });
            }
        });
    }
});

// Trust Proxy for correct IP behind load balancers/reverse proxies
app.set("trust proxy", 1);

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

