import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: 'no_api_key' });

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // We use v1beta to list models as it usually shows more
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        return Response.json(data);
    } catch (e: any) {
        return Response.json({ error: e.message });
    }
}
