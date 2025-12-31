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
        console.log(`[DiscogsPrice] Fetching v7 (Ultimate History Scrape) for releaseId=${releaseId}`);

        const apiHeaders = {
            'Authorization': `Discogs token=${token}`,
            'User-Agent': 'ByeByeSystem/0.1'
        };

        // Cache-busting for API calls too
        const [suggestionsRes, releaseRes, statsRes] = await Promise.all([
            fetch(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, { headers: apiHeaders, cache: 'no-store' }),
            fetch(`https://api.discogs.com/releases/${releaseId}`, { headers: apiHeaders, cache: 'no-store' }),
            fetch(`https://api.discogs.com/releases/${releaseId}/stats`, { headers: apiHeaders, cache: 'no-store' })
        ]);

        const suggestionsData = suggestionsRes.ok ? await suggestionsRes.json() : null;
        const releaseData = releaseRes.ok ? await releaseRes.json() : null;
        const statsData = statsRes.ok ? await statsRes.json() : null;

        let scrapedStats: any = null;

        // STRATEGY: Scrape both History page (for accurate stats) and Release page (for Year)
        try {
            // 1. Scrape Sales History Page
            const historyRes = await fetch(`https://www.discogs.com/sell/history/${releaseId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
                },
                cache: 'no-store'
            });

            if (historyRes.ok) {
                const historyHtml = await historyRes.text();

                // Helper to extract value based on the <small> label (History Page structure)
                const extractHistoryStat = (label: string) => {
                    // Pattern: ¥1,234\s*<small>Label</small>
                    const pattern = `([^<]+?)\\s*<small>\\s*${label}\\s*<\\/small>`;
                    const regex = new RegExp(pattern, 'i');
                    const match = historyHtml.match(regex);
                    if (match && match[1]) return match[1].trim();
                    return null;
                };

                const low = extractHistoryStat('低') || extractHistoryStat('Low');
                const med = extractHistoryStat('中間点') || extractHistoryStat('Median');
                const high = extractHistoryStat('高') || extractHistoryStat('High');
                const avg = extractHistoryStat('平均') || extractHistoryStat('Average');

                // Last Sold on History Page: <li>最後の販売： Dec 16, 2025</li>
                const lastSoldMatch = historyHtml.match(/(?:最後の販売：|Last Sold:)\s*([^<]+?)</i);
                const lastSold = lastSoldMatch ? lastSoldMatch[1].trim() : null;

                scrapedStats = { low, med, high, avg, lastSold };
                console.log(`[DiscogsPrice] Scraped History: Low=${low}, Med=${med}, High=${high}, Avg=${avg}, LastSold=${lastSold}`);
            }

            // 2. Scrape Release Page (Primarily for Year)
            const releasePageRes = await fetch(`https://www.discogs.com/release/${releaseId}`, {
                headers: {
                    'User-Agent': apiHeaders['User-Agent'],
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                cache: 'no-store'
            });
            if (releasePageRes.ok) {
                const releaseHtml = await releasePageRes.text();
                const releasedMatch = releaseHtml.match(/Released:?\s*<[^>]+?>\s*(?:<[^>]+?>\s*)*([^<]+?)</i);
                if (releasedMatch) {
                    scrapedStats = { ...scrapedStats, releasedYear: releasedMatch[1].trim() };
                }
            }
        } catch (scrapeErr) {
            console.error('[DiscogsPrice] Scraping error:', scrapeErr);
        }

        const finalStats = {
            num_want: statsData?.num_want || releaseData?.community?.want || null,
            num_have: statsData?.num_have || releaseData?.community?.have || null,
            avg_rating: releaseData?.community?.rating?.average || null,

            released: scrapedStats?.releasedYear || releaseData?.released || releaseData?.year || null,

            lowest_listing: releaseData?.lowest_price || null,
            num_for_sale: releaseData?.num_for_sale || null,

            history_low: scrapedStats?.low || null,
            history_med: scrapedStats?.med || null,
            history_high: scrapedStats?.high || null,
            history_avg: scrapedStats?.avg || null, // NEW: Average price
            last_sold: scrapedStats?.lastSold || releaseData?.last_sold || null,
            sales_history_url: `https://www.discogs.com/sell/history/${releaseId}`
        };

        return Response.json({
            type: 'stats_v7',
            stats: finalStats,
            scraped: !!scrapedStats,
            releaseId,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('[DiscogsPrice] Internal error:', e);
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
