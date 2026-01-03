
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Hack to access the model list since SDK might not expose it easily directly as a method on genAI instance
    // Actually usually it doesn't have a listModels method on the top level class in some versions, 
    // but let's try getting a model and seeing if we can generic call.
    // The SDK documentation says usually you know the model.

    // Let's try the direct REST call to be sure what the API sees if SDK fails
    // But wait, allow me to use the SDK if possible.
    // Since I can't easily browse SDK source, I'll use a fetch implementation to list models.

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Available models:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods.join(", ")})`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

main();
