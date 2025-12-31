import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const releaseId = searchParams.get('releaseId');
    const token = process.env.DISCOGS_TOKEN;

    if (!releaseId) {
        return Response.json({ error: 'missing_release_id' }, { status: 400 });
    }

    try {
        console.log(`[DiscogsPrice] Fetching for releaseId=${releaseId}`);

        const apiHeaders = {
            'Authorization': `Discogs token=${token}`,
            'User-Agent': 'ByeByeSystem/0.1'
        };

        const [suggestionsRes, releaseRes, statsRes] = await Promise.all([
            fetch(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, { headers: apiHeaders, cache: 'no-store' }),
            fetch(`https://api.discogs.com/releases/${releaseId}`, { headers: apiHeaders, cache: 'no-store' }),
            fetch(`https://api.discogs.com/releases/${releaseId}/stats`, { headers: apiHeaders, cache: 'no-store' })
        ]);

        const suggestionsData = suggestionsRes.ok ? await suggestionsRes.json() : null;
        const releaseData = releaseRes.ok ? await releaseRes.json() : null;
        const statsData = statsRes.ok ? await statsRes.json() : null;

        // SCRAPING: Fallback with Multi-language support
        let scrapedStats: any = null;
        try {
            const htmlRes = await fetch(`https://www.discogs.com/release/${releaseId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8' // Prefer JA but support EN
                },
                cache: 'no-store'
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                // Helper to try multiple labels (e.g. English and Japanese)
                const extractWithLabels = (labels: string[]) => {
                    for (const label of labels) {
                        const pattern = `${label}:?\\s*<\\/[^>]+?>\\s*<[^>]+?>\\s*([^<]+?)<`;
                        const regex = new RegExp(pattern, 'i');
                        const match = html.match(regex);
                        if (match && match[1]) return match[1].trim();
                    }
                    return null;
                };

                const low = extractWithLabels(['Low', '低']);
                const med = extractWithLabels(['Median', '中間点']);
                const high = extractWithLabels(['High', '高']);

                // LAST SOLD: Multi-language
                const lastSoldLabels = ['Last Sold', '最新の販売'];
                let lastSold = null;
                for (const label of lastSoldLabels) {
                    const pattern = `${label}:?\\s*<[^>]+?>\\s*(?:<[^>]+?>\\s*)*([^<]+?)<`;
                    const match = html.match(new RegExp(pattern, 'i'));
                    if (match && match[1] && !match[1].includes(label)) {
                        lastSold = match[1].trim();
                        break;
                    }
                }

                // Special nested check for Last Sold
                if (!lastSold || lastSold.length > 30) {
                    const timeMatch = html.match(/(?:Last Sold|最新の販売):?\s*<[^>]+?>\s*<a[^>]*>\s*<time[^>]*>([^<]+?)<\/time>/i);
                    if (timeMatch) lastSold = timeMatch[1].trim();
                }

                // RELEASED YEAR: Multi-language
                const releasedScraped = extractWithLabels(['Released', 'リリース済み', 'Released:']);

                if (low || med || high || lastSold) {
                    scrapedStats = { low, med, high, lastSold, releasedScraped };
                    console.log(`[DiscogsPrice] Scraped success (Multi): Low=${low}, Med=${med}, High=${high}, LastSold=${lastSold}, Year=${releasedScraped}`);
                } else {
                    console.warn(`[DiscogsPrice] Scraping failed to find stats for ${releaseId}. HTML Length: ${html.length}`);
                }
            }
        } catch (scrapeErr) {
            console.error('[DiscogsPrice] Scraping error:', scrapeErr);
        }

        const finalStats = {
            num_want: statsData?.num_want || releaseData?.community?.want || null,
            num_have: statsData?.num_have || releaseData?.community?.have || null,
            avg_rating: releaseData?.community?.rating?.average || null,

            released: scrapedStats?.releasedScraped || releaseData?.released || releaseData?.released_formatted || releaseData?.year || null,

            lowest_listing: releaseData?.lowest_price || null,
            num_for_sale: releaseData?.num_for_sale || null,

            history_low: scrapedStats?.low || null,
            history_med: scrapedStats?.med || null,
            history_high: scrapedStats?.high || null,
            last_sold: scrapedStats?.lastSold || releaseData?.last_sold || null
        };

        return Response.json({
            type: 'stats_v5', // Iteration v5
            stats: finalStats,
            scraped: !!scrapedStats,
            releaseId,
            timestamp: new Date().toISOString() // Force client to see freshness
        });
    } catch (e) {
        console.error('[DiscogsPrice] Internal error:', e);
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
