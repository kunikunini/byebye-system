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
        console.log(`[DiscogsPrice] releaseId=${releaseId}`);

        // Get everything in parallel for maximum speed and data availability
        const [suggestionsRes, releaseRes, statsRes] = await Promise.all([
            fetch(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            }),
            fetch(`https://api.discogs.com/releases/${releaseId}`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            }),
            fetch(`https://api.discogs.com/releases/${releaseId}/stats`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            })
        ]);

        const suggestionsData = suggestionsRes.ok ? await suggestionsRes.json() : null;
        const releaseData = releaseRes.ok ? await releaseRes.json() : null;
        const statsData = statsRes.ok ? await statsRes.json() : null;

        if (!releaseRes.ok && !suggestionsRes.ok) {
            console.error(`[DiscogsPrice] All critical endpoints failed for ${releaseId}`);
            return Response.json({ error: 'no_data_available' }, { status: 404 });
        }

        console.log(`[DiscogsPrice] Data fetched for ${releaseId}. Sug:${!!suggestionsData} Rel:${!!releaseData} Stat:${!!statsData}`);

        return Response.json({
            type: suggestionsData ? 'suggestions' : 'stats',
            suggestions: suggestionsData,
            release: releaseData,
            stats: statsData, // Should contain lowest_price, median, highest_price, last_sold, num_for_sale
            releaseId
        });
    } catch (e) {
        console.error('[DiscogsPrice] Internal error:', e);
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
