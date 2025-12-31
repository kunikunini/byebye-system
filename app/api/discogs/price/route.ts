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

        // SCRAPING: Multi-layered extraction
        let scrapedStats: any = null;
        try {
            const htmlRes = await fetch(`https://www.discogs.com/release/${releaseId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                cache: 'no-store'
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                // ULTIMATE REGEX: Handles colons, optional spaces, and nested tags
                // Pattern explanation:
                // Label (Low/Median/High) + optional colon (:) + closing tag + optional whitespace 
                // + opening tag of the NEXT element + actual value inside
                const robustExtract = (label: string) => {
                    const pattern = `${label}:?\\s*<\\/[^>]+?>\\s*<[^>]+?>\\s*([^<]+?)<`;
                    const regex = new RegExp(pattern, 'i');
                    const match = html.match(regex);
                    if (match && match[1]) return match[1].trim();
                    return null;
                };

                const low = robustExtract('Low');
                const med = robustExtract('Median');
                const high = robustExtract('High');

                // LAST SOLD: Special handling because it's often inside <a><time>
                // Looking for "Last Sold:" followed by anything until we hit a <time> or the next <span>
                const lastSoldRegex = /Last Sold:?\s*<[^>]+?>\s*(?:<[^>]+?>\s*)*([^<]+?)</i;
                const lastSoldMatch = html.match(lastSoldRegex);
                let lastSold = lastSoldMatch ? lastSoldMatch[1].trim() : null;

                // If the first match is empty or a tag, try to look specifically for <time> content
                if (!lastSold || lastSold.includes('Sold')) {
                    const timeRegex = /Last Sold:?\s*<[^>]+?>\s*<a[^>]*>\s*<time[^>]*>([^<]+?)<\/time>/i;
                    const timeMatch = html.match(timeRegex);
                    if (timeMatch) lastSold = timeMatch[1].trim();
                }

                // RELEASED YEAR: Extract from "Released:" line
                const releasedRegex = /Released:?\s*<[^>]+?>\s*(?:<[^>]+?>\s*)*([^<]+?)</i;
                const releasedMatch = html.match(releasedRegex);
                const releasedScraped = releasedMatch ? releasedMatch[1].trim() : null;

                if (low || med || high || lastSold) {
                    scrapedStats = { low, med, high, lastSold, releasedScraped };
                    console.log(`[DiscogsPrice] Scraped success: Low=${low}, Med=${med}, High=${high}, LastSold=${lastSold}, Year=${releasedScraped}`);
                }
            }
        } catch (scrapeErr) {
            console.error('[DiscogsPrice] Scraping error:', scrapeErr);
        }

        // --- MERGE DATA ---
        const finalStats = {
            num_want: statsData?.num_want || releaseData?.community?.want || null,
            num_have: statsData?.num_have || releaseData?.community?.have || null,
            avg_rating: releaseData?.community?.rating?.average || null,

            // Released Info (Prioritize Scraped for display accuracy, then API)
            released: scrapedStats?.releasedScraped || releaseData?.released || releaseData?.released_formatted || releaseData?.year || null,

            // Marketplace (For Sale)
            lowest_listing: releaseData?.lowest_price || null,
            num_for_sale: releaseData?.num_for_sale || null,

            // History (Prioritize Scraped for Statistics box parity)
            history_low: scrapedStats?.low || null,
            history_med: scrapedStats?.med || null,
            history_high: scrapedStats?.high || null,
            last_sold: scrapedStats?.lastSold || releaseData?.last_sold || null
        };

        return Response.json({
            type: 'stats_v4',
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
