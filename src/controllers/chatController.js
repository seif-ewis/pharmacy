import db from "../config/dataBase.js";

export const saveMessage = async (userId, message) => {
    try {
        // 1. Check for an existing OPEN chat for this user
        // We assume 'active' status means the chat is ongoing
        const chatResult = await db.query(
            `SELECT id FROM chats WHERE patient_id = $1 AND status = 'active' LIMIT 1`,
            [userId]
        );

        let chatId;

        if (chatResult.rows.length > 0) {
            chatId = chatResult.rows[0].id;
        } else {
            // 2. Create a new chat if none exists
            // patient_id is the user, pharmacist_id is NULL initially
            const newChat = await db.query(
                `INSERT INTO chats (patient_id, status, created_at, last_message_at) 
                 VALUES ($1, 'active', NOW(), NOW()) 
                 RETURNING id`,
                [userId]
            );
            chatId = newChat.rows[0].id;
        }

        // 3. Insert the message into 'messages' table
        // sender_id is the user, type is 'text' (default)
        await db.query(
            `INSERT INTO messages (chat_id, sender_id, message, type, read, created_at) 
             VALUES ($1, $2, $3, 'text', false, NOW())`,
            [chatId, userId, message]
        );

        // 4. Update the chat's last_message_at timestamp
        await db.query(`UPDATE chats SET last_message_at = NOW() WHERE id = $1`, [chatId]);

        return true;
    } catch (err) {
        console.error("Chat save error:", err);
        return false;
    }
};
export const getChatHistory = async (userId) => {
    try {
        // 1. Get current active chat and pharmacist info
        const chatInfo = await db.query(
            `
            SELECT c.id, c.status, u.full_name as pharmacist_name
            FROM chats c
            LEFT JOIN users u ON u.id = c.pharmacist_id
            WHERE c.patient_id = $1 AND c.status = 'active'
            LIMIT 1
            `,
            [userId]
        );

        if (chatInfo.rows.length === 0) return { chat: null, messages: [] };

        // 2. Get messages for this chat
        const messages = await db.query(
            `
            SELECT message, sender_id, created_at
            FROM messages
            WHERE chat_id = $1
            ORDER BY created_at ASC
            `,
            [chatInfo.rows[0].id]
        );

        return {
            chat: chatInfo.rows[0],
            messages: messages.rows
        };
    } catch (err) {
        console.error("Error fetching chat history:", err);
        return { chat: null, messages: [] };
    }
};
