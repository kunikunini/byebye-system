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

        // 1. Fetch API Data (Want/Have, Metadata)
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

        // 2. SCRAPING: Get Sales History (Low/Med/High) from HTML
        // This is necessary because the official API doesn't expose these 3 stats.
        let scrapedStats: any = null;
        try {
            const htmlRes = await fetch(`https://www.discogs.com/release/${releaseId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
                },
                next: { revalidate: 3600 } // Cache for 1 hour
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                // Helper to extract value after a label
                const extractValue = (label: string) => {
                    // Look for the label followed by a value-wrapped span or similar
                    // The structure found by browser: <span class="name_XXXX">Low</span><span>¥1,234</span>
                    const regex = new RegExp(`>\\s*${label}\\s*<\\/span>\\s*<span[^>]*>(.*?)<\\/span>`, 'i');
                    const match = html.match(regex);
                    if (match && match[1]) {
                        return match[1].trim();
                    }
                    return null;
                };

                const low = extractValue('Low');
                const med = extractValue('Median');
                const high = extractValue('High');

                // Extract Last Sold
                const lastSoldRegex = />\s*Last Sold\s*<\/span>\s*<a[^>]*>\s*<time[^>]*>(.*?)<\/time>/i;
                const lastSoldMatch = html.match(lastSoldRegex);
                const lastSold = lastSoldMatch ? lastSoldMatch[1].trim() : null;

                if (low || med || high) {
                    scrapedStats = { low, med, high, lastSold };
                    console.log(`[DiscogsPrice] Scraped stats successfully for ${releaseId}`);
                } else {
                    console.warn(`[DiscogsPrice] Scraped stats failed (not found in HTML) for ${releaseId}`);
                }
            }
        } catch (scrapeErr) {
            console.error('[DiscogsPrice] Scraping error:', scrapeErr);
        }

        // 3. COMBINE DATA
        // Priority: Scraped Stats (Matches Website) > API Stats
        const finalStats = {
            num_want: statsData?.num_want || releaseData?.community?.want || null,
            num_have: statsData?.num_have || releaseData?.community?.have || null,
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
