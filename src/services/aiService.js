
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

let genAI = null;
let model = null;

try {
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use a model that supports JSON mode if possible (Gemini 2.5 Flash is available)
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    } else {
        console.warn("⚠️ GEMINI_API_KEY not found. AI features will run in MOCK mode.");
    }
} catch (err) {
    console.error("Failed to initialize AI:", err);
}

/**
 * Generate product details using AI.
 * @param {string} productName - Name of the medicine/product
 * @returns {Promise<Object>} JSON object with description, benefits, side_effects, price
 */
export const generateProductDetails = async (productName) => {
    // 1. Mock Mode (Fallback)
    if (!model) {
        console.log(`🤖 AI Mock: Generating details for ${productName}`);
        return {
            description: `(AI Generated) ${productName} is commonly used for [Condition]. It works by [Mechanism]. Please verify this information manually.`,
            benefits: "Relieves symptoms effectively (Mock Benefit)",
            side_effects: "Drowsiness or Nausea (Mock Side Effect)",
            price: 19.99,
            ai_generated: true
        };
    }

    // 2. Real AI Generation
    try {
        const prompt = `
        You are a medical product information assistant.

        If the medicine name "${productName}" is unknown or ambiguous, return:
        { "error": "UNKNOWN" }

        Return ONLY valid JSON.
        (Do NOT wrap the JSON in markdown code blocks. The 'description' value inside the JSON *should* use Markdown).

        STRICT RULES:
        - Do NOT invent rare or extreme side effects.
        - Use neutral, factual medical language.
        - If something is uncertain, write "Not verified".
        - Price must be an approximate NUMBER in USD (no currency symbol).

        DESCRIPTION FORMAT (Markdown):
        The description must be formatted with **Bold Headers** to separate sections.
        Use **⚠️ WARNING:** or **❗ PRECAUTION:** to highlight risks.
        
        Required Structure:
        **What it is:**
        [Brief explanation]

        **Medical Uses:**
        [Common uses]

        **How it works:**
        [Mechanism]

        **⚠️ Warnings & Precautions:**
        [Critical warnings]

        **Possible Side Effects:**
        [List or summary]

        EXTRACTED FIELDS:
        - benefits → ONLY the single most important benefit (1 sentence)
        - side_effects → ONLY the single most common side effect (1 sentence)

        JSON FORMAT:
        {
          "description": "Markdown formatted description string...",
          "benefits": "Single most important benefit",
          "side_effects": "Single most common side effect",
          "price": number
        }

        Generate the JSON now.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Cleanup markdown code blocks if present (Gemini sometimes adds ```json ... ```)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(cleanText);

        return {
            ...data,
            ai_generated: true
        };

    } catch (error) {
        if (error.status === 429 || error.message?.includes('429')) {
            console.warn("⚠️ AI Rate Limit Exceeded. Falling back to Mock Data.");
            return {
                description: `(AI Rate Limited) ${productName} is commonly used for [Condition]. Please verify manually.`,
                benefits: "Relieves symptoms (Mock)",
                side_effects: "Drowsiness (Mock)",
                price: 25.00,
                ai_generated: true,
                error: "RATE_LIMIT"
            };
        }
        console.error("AI Generation Error:", error);
        throw new Error("Failed to generate AI content. Please try again or fill manually.");
    }
};
