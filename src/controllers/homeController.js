import db from "../config/dataBase.js";
import { formatTimeAgo } from "../utils/formatDate.js";
import * as chatController from "./chatController.js";

export const getHomePage = async (req, res) => {

    // Define categories once
    const CATEGORIES = ["featuredMedicines", "dailyEssentials", "wellnessProducts", "servicesProducts"];
    const products = {
        featuredMedicines: [],
        dailyEssentials: [],
        wellnessProducts: [],
        servicesProducts: []
    };

    try {
        const result = await db.query(`
            SELECT id, name, description, price, original_price, icon, quantity, category
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) AS rn
                FROM medicines
                WHERE category = ANY($1)
            ) sub
            WHERE rn <= 10
        `, [CATEGORIES]);

        // Group by category
        result.rows.forEach(row => {
            if (products[row.category]) {
                products[row.category].push({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    price: row.price,
                    originalPrice: row.original_price,
                    icon: row.icon,
                    stock: row.quantity
                });
            }
        });

    } catch (err) {
        console.error("Homepage medicines error:", err);
        return res.status(500).send("Internal Server Error");
    }





    // ...

    /* ================= Notifications ================= */

    let notifications = [];

    if (req.isAuthenticated()) {
        try {
            const notifResult = await db.query(
                `
                SELECT n.id, n.title, n.message, n.type, n.created_at, un.read
                FROM user_notifications un
                JOIN notifications n ON n.id = un.notification_id
                WHERE un.user_id = $1 AND un.read = false
                ORDER BY un.sent_at DESC
                LIMIT 5
                `,
                [req.user.id]

            );
            notifications = notifResult.rows.map(n => ({
                ...n,
                time: formatTimeAgo(n.created_at)
            }));
        } catch (err) {
            console.error("Notifications error:", err);
        }
    }

    /* ================= Chat History ================= */
    let activeChat = null;
    let chatMessages = [];
    if (req.isAuthenticated()) {
        try {
            const chatData = await chatController.getChatHistory(req.user.id);
            activeChat = chatData.chat;
            chatMessages = chatData.messages;
        } catch (err) {
            console.error("Home chat history error:", err);
        }
    }

    /* ================= Render ================= */

    res.render("home", {
        notifications,
        // pharmacySettings, // NOW GLOBAL
        activeChat,
        chatMessages,
        error: req.flash("error"),
        success: req.flash("success"),
        ...products,
    });
};
