
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function listModels() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            fs.writeFileSync('available_models.txt', "❌ GEMINI_API_KEY is missing in .env");
            return;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        let output = `API Check Result:\nKey Prefix: ${process.env.GEMINI_API_KEY.substring(0, 5)}...\n`;

        if (data.models) {
            output += "\n✅ Available Models:\n";
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    output += `- ${m.name} (${m.displayName})\n`;
                }
            });
        } else {
            output += `\n❌ Failed to list models: ${JSON.stringify(data, null, 2)}\n`;
        }

        fs.writeFileSync('available_models.txt', output);
        console.log("Output written to available_models.txt");

    } catch (err) {
        fs.writeFileSync('available_models.txt', `❌ Error: ${err.message}`);
        console.error("Error:", err);
    }
}

listModels();
