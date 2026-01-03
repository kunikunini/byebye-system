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
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"macOS"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    // Note: This is an attempt to look like a browser. If this fails, we might need a real session cookie.
                    'Cookie': 'discogs_browser_id=b43534g-gu-43-g34; dps_site_id=discogs; locale=ja'
                },
                cache: 'no-store'
            });

            if (historyRes.ok) {
                const historyHtml = await historyRes.text();

                // Helper to extract value based on the <small> label (History Page structure)
                const extractHistoryStat = (label: string) => {
                    // Pattern 1: Simple structure (value then label)
                    // ¥1,234 <small>Label</small> or ¥1,234<small>Label</small>
                    const pattern1 = `([¥$€£][0-9,.]+|--)\\s*<small>\\s*${label}\\s*<\\/small>`;

                    // Pattern 2: Label then value (sometimes appears in mobile views or different layouts)
                    // <small>Label</small> ¥1,234
                    const pattern2 = `<small>\\s*${label}\\s*<\\/small>\\s*([¥$€£][0-9,.]+|--)`;

                    // Pattern 3: Data attribute or more complex nesting (Generic fallback)
                    const pattern3 = `${label}[^<]*<\\/small>[^<]*<span[^>]*>([¥$€£][0-9,.]+|--)`;

                    const regex1 = new RegExp(pattern1, 'i');
                    const regex2 = new RegExp(pattern2, 'i');
                    const regex3 = new RegExp(pattern3, 'i');

                    const match1 = historyHtml.match(regex1);
                    if (match1 && match1[1]) return match1[1].trim();

                    const match2 = historyHtml.match(regex2);
                    if (match2 && match2[1]) return match2[1].trim();

                    const match3 = historyHtml.match(regex3);
                    if (match3 && match3[1]) return match3[1].trim();

                    return null;
                };

                const low = extractHistoryStat('低') || extractHistoryStat('Low') || extractHistoryStat('Lowest');
                const med = extractHistoryStat('中間点') || extractHistoryStat('Median');
                const high = extractHistoryStat('高') || extractHistoryStat('High') || extractHistoryStat('Highest');
                const avg = extractHistoryStat('平均') || extractHistoryStat('Average');

                // Last Sold on History Page: <li>最後の販売： Dec 16, 2025</li>
                const lastSoldMatch = historyHtml.match(/(?:最後の販売：|Last Sold:)\s*<a[^>]*>\s*([^<]+?)\s*<\/a>|(?:\s*Last Sold:\s*)([^<]+)/i);
                const lastSold = lastSoldMatch ? (lastSoldMatch[1] || lastSoldMatch[2]).trim() : null;

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
