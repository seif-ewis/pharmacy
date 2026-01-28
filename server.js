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
io.on("connection", (socket) => {
    const user = socket.request.user;
    if (user) {
        console.log(`User connected: ${user.full_name} (${user.id})`);
        socket.join(`user_${user.id}`);

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
                return; // Don't broadcast if save failed (optional decision)
            }

            // Forward to Doctors
            io.to('doctors').emit('doctor notification', {
                userId: user.id,
                userName: user.full_name,
                message: cleanMsg,
                time: new Date()
            });
        });

        socket.on("typing", () => {
            io.to('doctors').emit('user typing', { userId: user.id, userName: user.full_name });
        });

        socket.on("stop typing", () => {
            io.to('doctors').emit('user stop typing', { userId: user.id });
        });
    }

    socket.on("disconnect", () => {
        // console.log("User disconnected");
    });
});

// Trust Proxy for correct IP behind load balancers/reverse proxies
app.set("trust proxy", 1);

app.use((req, res) => {
    res.status(404).render("404", { pageTitle: "Page Not Found", user: req.user });
});



server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
