import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const releaseId = searchParams.get('releaseId');
    const token = process.env.DISCOGS_TOKEN;

    if (!releaseId) {
        return Response.json({ error: 'missing_release_id' }, { status: 400 });
    }

    try {
        console.log(`[DiscogsPrice] Fetching data for releaseId=${releaseId}`);

        const apiHeaders = {
            'Authorization': `Discogs token=${token}`,
            'User-Agent': 'ByeByeSystem/0.1'
        };

        // Fetch API in parallel
        const [suggestionsRes, releaseRes, statsRes] = await Promise.all([
            fetch(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, { headers: apiHeaders }),
            fetch(`https://api.discogs.com/releases/${releaseId}`, { headers: apiHeaders }),
            fetch(`https://api.discogs.com/releases/${releaseId}/stats`, { headers: apiHeaders })
        ]);

        const suggestionsData = suggestionsRes.ok ? await suggestionsRes.json() : null;
        const releaseData = releaseRes.ok ? await releaseRes.json() : null;
        const statsData = statsRes.ok ? await statsRes.json() : null;

        // SCRAPING fallback: Official API doesn't provide Median/High.
        let scrapedStats: any = null;
        try {
            // Adding cache: 'no-store' to force fresh data from Discogs Website
            const htmlRes = await fetch(`https://www.discogs.com/release/${releaseId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
                },
                cache: 'no-store'
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                // More flexible Regex to handle variations in span order, classes, and spacing
                const robustExtract = (label: string) => {
                    // Pattern: label text inside a tag, then look for the next tag containing a price (¥, $, etc.)
                    // Example: <span class="xxx">Median</span><span class="yyy">¥1,234</span>
                    const regex = new RegExp(`${label}\\s*<\\/span>\\s*<span[^>]*>\\s*([^<]+?)\\s*<\\/span>`, 'i');
                    const match = html.match(regex);
                    if (match && match[1]) return match[1].trim();

                    // Fallback for different HTML structures
                    const fallbackRegex = new RegExp(`${label}:?\\s*<\\/[^>]+?>\\s*<[^>]+?>\\s*([^<]+?)\\s*<`, 'i');
                    const fallbackMatch = html.match(fallbackRegex);
                    if (fallbackMatch && fallbackMatch[1]) return fallbackMatch[1].trim();

                    return null;
                };

                const low = robustExtract('Low');
                const med = robustExtract('Median');
                const high = robustExtract('High');

                // Extract Last Sold
                const lastSoldRegex = /Last Sold\s*<\/span>\s*<a[^>]*>\s*<time[^>]*>(.*?)<\/time>/i;
                const lastSoldMatch = html.match(lastSoldRegex);
                const lastSold = lastSoldMatch ? lastSoldMatch[1].trim() : null;

                if (low || med || high) {
                    scrapedStats = { low, med, high, lastSold };
                    console.log(`[DiscogsPrice] Scraped stats successfully for ${releaseId}: Low=${low}, Med=${med}, High=${high}`);
                }
            }
        } catch (scrapeErr) {
            console.error('[DiscogsPrice] Scraping error:', scrapeErr);
        }

        // --- MERGE LOGIC ---
        // We prioritize scraped strings if they match the "¥XXXX" format 
        // because the user wants EXACT consistency with the website display.
        const finalStats = {
            num_want: statsData?.num_want || releaseData?.community?.want || null,
            num_have: statsData?.num_have || releaseData?.community?.have || null,
            // If scraping worked, use 'low' as the representative 'lowest_price'
            lowest_price: scrapedStats?.low || releaseData?.lowest_price || null,
            median: scrapedStats?.med || null,
            highest_price: scrapedStats?.high || null,
            last_sold: scrapedStats?.lastSold || releaseData?.last_sold || null,
            num_for_sale: releaseData?.num_for_sale || null
        };

        return Response.json({
            type: suggestionsData ? 'suggestions' : 'stats',
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
