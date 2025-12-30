import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const releaseId = searchParams.get('releaseId');
    const token = process.env.DISCOGS_TOKEN;

    if (!releaseId) {
        return Response.json({ error: 'missing_release_id' }, { status: 400 });
    }

    if (!token) {
        return Response.json({ error: 'missing_token' }, { status: 500 });
    }

    try {
        // Try suggestions first
        const suggestionsUrl = `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`;
        const sRes = await fetch(suggestionsUrl, {
            headers: {
                'Authorization': `Discogs token=${token}`,
                'User-Agent': 'ByeByeSystem/0.1'
            }
        });

        if (sRes.ok) {
            const data = await sRes.json();
            return Response.json({ type: 'suggestions', data, releaseId });
        }

        // Fallback to release stats if suggestions are 404 or other errors
        console.log(`Suggestions not found for ${releaseId}, trying stats fallback...`);
        const statsUrl = `https://api.discogs.com/releases/${releaseId}`;
        const stRes = await fetch(statsUrl, {
            headers: {
                'Authorization': `Discogs token=${token}`,
                'User-Agent': 'ByeByeSystem/0.1'
            }
        });

        if (stRes.ok) {
            const releaseData = await stRes.json();
            return Response.json({ type: 'stats', data: releaseData, releaseId });
        }

        return Response.json({ error: 'no_data_available' }, { status: 404 });
    } catch (e) {
        console.error('Price API internal error:', e);
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
