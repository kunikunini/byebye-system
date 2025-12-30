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

        // 1. Try Marketplace Price Suggestions (Seller view)
        // Note: This endpoint is only available for marketplace items and might require seller permissions.
        const suggestionsUrl = `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`;
        const sRes = await fetch(suggestionsUrl, {
            headers: {
                'Authorization': `Discogs token=${token}`,
                'User-Agent': 'ByeByeSystem/0.1'
            }
        });

        if (sRes.ok) {
            const data = await sRes.json();
            console.log(`[DiscogsPrice] Suggestions found for ${releaseId}`);

            // Try to add community stats for Want/Have/Rating
            const statsRes = await fetch(`https://api.discogs.com/releases/${releaseId}/stats`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            });
            const stats = statsRes.ok ? await statsRes.json() : null;

            return Response.json({ type: 'suggestions', data, stats, releaseId });
        }

        // 2. Fallback to Release Details and Stats (Buyer/History view)
        console.log(`[DiscogsPrice] Suggestions failed (HTTP ${sRes.status}), trying stats fallback for ${releaseId}...`);

        const [releaseRes, statsRes] = await Promise.all([
            fetch(`https://api.discogs.com/releases/${releaseId}`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            }),
            fetch(`https://api.discogs.com/releases/${releaseId}/stats`, {
                headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ByeByeSystem/0.1' }
            })
        ]);

        if (releaseRes.ok) {
            const releaseData = await releaseRes.json();
            const statsData = statsRes.ok ? await statsRes.json() : null;

            console.log(`[DiscogsPrice] Release details OK for ${releaseId}`);
            if (statsData) {
                console.log(`[DiscogsPrice] Stats found for ${releaseId}. Properties: ${Object.keys(statsData).join(', ')}`);
            } else {
                console.warn(`[DiscogsPrice] Stats failed (HTTP ${statsRes.status}) for ${releaseId}`);
            }

            return Response.json({
                type: 'stats',
                data: releaseData,
                stats: statsData, // This contains lowest_price, median, highest_price, last_sold if available
                releaseId
            });
        }

        console.error(`[DiscogsPrice] Both attempts failed for ${releaseId}`);
        return Response.json({ error: 'no_data_available' }, { status: 404 });
    } catch (e) {
        console.error('[DiscogsPrice] Internal error:', e);
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
