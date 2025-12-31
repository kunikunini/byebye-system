import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const releaseId = searchParams.get('releaseId');
    const token = process.env.DISCOGS_TOKEN;

    if (!releaseId) {
        return Response.json({ error: 'missing_release_id' }, { status: 400 });
    }

    try {
        console.log(`[DiscogsPrice] releaseId=${releaseId}`);

        const apiHeaders = {
            'Authorization': `Discogs token=${token}`,
            'User-Agent': 'ByeByeSystem/0.1'
        };

        const [suggestionsRes, releaseRes, statsRes] = await Promise.all([
            fetch(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, { headers: apiHeaders }),
            fetch(`https://api.discogs.com/releases/${releaseId}`, { headers: apiHeaders }),
            fetch(`https://api.discogs.com/releases/${releaseId}/stats`, { headers: apiHeaders })
        ]);

        const suggestionsData = suggestionsRes.ok ? await suggestionsRes.json() : null;
        const releaseData = releaseRes.ok ? await releaseRes.json() : null;
        const statsData = statsRes.ok ? await statsRes.json() : null;

        // SCRAPING: Force English to ensure "Low", "Median", "High" labels
        let scrapedStats: any = null;
        try {
            const htmlRes = await fetch(`https://www.discogs.com/release/${releaseId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9' // FORCE ENGLISH for stable scraping
                },
                cache: 'no-store'
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                const robustExtract = (label: string) => {
                    const regex = new RegExp(`${label}\\s*<\\/span>\\s*<span[^>]*>\\s*([^<]+?)\\s*<\\/span>`, 'i');
                    const match = html.match(regex);
                    if (match && match[1]) return match[1].trim();
                    return null;
                };

                const low = robustExtract('Low');
                const med = robustExtract('Median');
                const high = robustExtract('High');

                const lastSoldRegex = /Last Sold\s*<\/span>\s*<a[^>]*>\s*<time[^>]*>(.*?)<\/time>/i;
                const lastSoldMatch = html.match(lastSoldRegex);
                const lastSold = lastSoldMatch ? lastSoldMatch[1].trim() : null;

                if (low || med || high) {
                    scrapedStats = { low, med, high, lastSold };
                    console.log(`[DiscogsPrice] Scraped success (EN): Low=${low}, Med=${med}, High=${high}`);
                }
            }
        } catch (scrapeErr) {
            console.error('[DiscogsPrice] Scraping error:', scrapeErr);
        }

        // --- MERGE & SEPARATE DATA ---
        // Enhanced structure with Year
        const finalStats = {
            num_want: statsData?.num_want || releaseData?.community?.want || null,
            num_have: statsData?.num_have || releaseData?.community?.have || null,
            avg_rating: releaseData?.community?.rating?.average || null,

            // Year/Released
            released: releaseData?.released || releaseData?.released_formatted || releaseData?.year || null,

            // 1. Current Marketplace (For Sale)
            lowest_listing: releaseData?.lowest_price || null,
            num_for_sale: releaseData?.num_for_sale || null,

            // 2. Statistics / Sales History (Historical)
            history_low: scrapedStats?.low || null,
            history_med: scrapedStats?.med || null,
            history_high: scrapedStats?.high || null,
            last_sold: scrapedStats?.lastSold || releaseData?.last_sold || null
        };

        return Response.json({
            type: 'stats_v3',
            suggestions: suggestionsData,
            release: releaseData,
            stats: finalStats,
            scraped: !!scrapedStats,
            releaseId
        });
    } catch (e) {
        console.error('[DiscogsPrice] Internal error:', e);
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
