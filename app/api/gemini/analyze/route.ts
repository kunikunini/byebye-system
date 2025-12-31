import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase';
import { getDb } from '@/db/client';
import { captures } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return Response.json({ error: 'missing_api_key', message: 'GEMINI_API_KEY is not set in .env.local' }, { status: 500 });
    }

    try {
        const { itemId } = await req.json();
        if (!itemId) {
            return Response.json({ error: 'invalid_request' }, { status: 400 });
        }

        const db = getDb();
        // Get the latest 'front' jacket image
        const [capture] = await db
            .select()
            .from(captures)
            .where(and(eq(captures.itemId, itemId), eq(captures.kind, 'front')))
            .orderBy(desc(captures.createdAt))
            .limit(1);

        if (!capture) {
            return Response.json({ error: 'no_front_image', message: 'フロント（表面）の画像が見つかりません。先にアップロードしてください。' }, { status: 404 });
        }

        const supa = getSupabaseAdmin();
        const { data: blob, error: downloadError } = await supa.storage
            .from('captures')
            .download(capture.storagePath);

        if (downloadError || !blob) {
            return Response.json({ error: 'storage_error', message: '画像の取得に失敗しました。' }, { status: 500 });
        }

        // Convert blob to base64
        const buffer = await blob.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        // Gemini AI Analysis: Using gemini-flash-latest for stable performance and high free quota
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Analyze this record jacket image and extract the following information in JSON format:
{
  "artist": "Artist name",
  "title": "Album or single title",
  "catalogNo": "Catalog number (if visible, e.g. EYS-81015)"
}
If any information is not visible, return an empty string for that field.
Only return the JSON object, nothing else.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg"
                }
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Sanitize output (remove markdown blocks if present)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI returned non-JSON response');
        }

        const extractedData = JSON.parse(jsonMatch[0]);

        return Response.json(extractedData);

    } catch (e: any) {
        console.error('Gemini error:', e);
        return Response.json({ error: 'ai_error', message: e.message }, { status: 500 });
    }
}
