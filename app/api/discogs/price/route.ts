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
        // 1. Try Marketplace Price Suggestions (Seller view)
        const suggestionsUrl = `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`;
        const sRes = await fetch(suggestionsUrl, {
            headers: {
                'Authorization': `Discogs token=${token}`,
                'User-Agent': 'ByeByeSystem/0.1'
            }
        });

        if (sRes.ok) {
            const data = await sRes.json();
            // Even if we have suggestions, we might want community stats for Want/Have
            const statsRes = await fetch(`https://api.discogs.com/releases/${releaseId}/stats`, {
                headers: {
                    'Authorization': `Discogs token=${token}`,
                    'User-Agent': 'ByeByeSystem/0.1'
                }
            });
            const stats = statsRes.ok ? await statsRes.json() : null;
            return Response.json({ type: 'suggestions', data, stats, releaseId });
        }

        // 2. Fallback to Release Stats (Buyer/History view)
        console.log(`Suggestions not found for ${releaseId}, trying stats fallback...`);

        // Fetch both release details and stats
        const [releaseRes, statsRes] = await Promise.all([
            fetch(`https://api.discogs.com/releases/${releaseId}`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            }),
            fetch(`https://api.discogs.com/releases/${releaseId}/stats`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            })
        ]);

        if (releaseRes.ok && statsRes.ok) {
            const releaseData = await releaseRes.json();
            const statsData = await statsRes.json();

            return Response.json({
                type: 'stats',
                data: releaseData, // release info (community, etc.)
                stats: statsData,   // historical price info (num_for_sale, lowest_price, last_sold, num_have, num_want)
                releaseId
            });
        }

        return Response.json({ error: 'no_data_available' }, { status: 404 });
    } catch (e) {
        console.error('Price API internal error:', e);
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
