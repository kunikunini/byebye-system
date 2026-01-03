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

        // Gemini AI Analysis: Using gemini-1.5-flash for better stability and JSON mode support
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `Analyze this record jacket image and extract the following information in JSON format:
{
  "artist": "Artist name",
  "title": "Album or single title",
  "catalogNo": "Catalog number (if visible, e.g. EYS-81015)"
}
If any information is not visible, return an empty string for that field.`;

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

        // With responseMimeType: "application/json", the text should be valid JSON
        let extractedData;
        try {
            extractedData = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse (supposedly) JSON response:', text);
            // Fallback: try to find JSON block if strict parse fails (though unlikely with JSON mode)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI returned invalid JSON');
            }
        }

        return Response.json(extractedData);

    } catch (e: any) {
        console.error('Gemini error:', e);

        // Check for common Gemini errors
        if (e.message?.includes('429')) {
            return Response.json({ error: 'rate_limit', message: 'AIの利用制限に達しました。しばらく待ってから再試行してください。' }, { status: 429 });
        }
        if (e.message?.includes('SAFETY')) {
            return Response.json({ error: 'safety_block', message: '画像の安全フィルターにより読み取りが拒否されました。' }, { status: 422 });
        }

        return Response.json({ error: 'ai_error', message: e.message || 'AI分析中に不明なエラーが発生しました' }, { status: 500 });
    }
}
