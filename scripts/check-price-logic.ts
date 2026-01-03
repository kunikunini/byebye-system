
import https from 'https';

const RELEASE_ID = '33729'; // Daft Punk - Homework (usually has sales)

function fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
    });
}

async function testScrape() {
    console.log(`Testing scraping for Release ID: ${RELEASE_ID}`);
    const historyUrl = `https://www.discogs.com/sell/history/${RELEASE_ID}`;

    try {
        const historyHtml = await fetchUrl(historyUrl);
        console.log(`Fetched ${historyHtml.length} bytes.`);

        const extractHistoryStat = (label: string) => {
            // Pattern 1: Simple structure (value then label)
            const pattern1 = `([¥$€£][0-9,.]+|--)\\s*<small>\\s*${label}\\s*<\\/small>`;
            // Pattern 2: Label then value
            const pattern2 = `<small>\\s*${label}\\s*<\\/small>\\s*([¥$€£][0-9,.]+|--)`;
            // Pattern 3: Generic fallback
            const pattern3 = `${label}[^<]*<\\/small>[^<]*<span[^>]*>([¥$€£][0-9,.]+|--)`;

            const regex1 = new RegExp(pattern1, 'i');
            const regex2 = new RegExp(pattern2, 'i');
            const regex3 = new RegExp(pattern3, 'i');

            const match1 = historyHtml.match(regex1);
            if (match1 && match1[1]) {
                console.log(`[OK] Matched Pattern 1 for ${label}: ${match1[1]}`);
                return match1[1].trim();
            }

            const match2 = historyHtml.match(regex2);
            if (match2 && match2[1]) {
                console.log(`[OK] Matched Pattern 2 for ${label}: ${match2[1]}`);
                return match2[1].trim();
            }

            const match3 = historyHtml.match(regex3);
            if (match3 && match3[1]) {
                console.log(`[OK] Matched Pattern 3 for ${label}: ${match3[1]}`);
                return match3[1].trim();
            }

            console.log(`[FAIL] No match for ${label}`);
            return null;
        };

        const low = extractHistoryStat('低') || extractHistoryStat('Low') || extractHistoryStat('Lowest');
        const med = extractHistoryStat('中間点') || extractHistoryStat('Median');
        const high = extractHistoryStat('高') || extractHistoryStat('High') || extractHistoryStat('Highest');
        const avg = extractHistoryStat('平均') || extractHistoryStat('Average');

        console.log('---------------------------------------------------');
        console.log('Scraping Results:');
        console.log({ low, med, high, avg });

        // Debug: Print a snippet if failed
        if (!low && !med && !high) {
            console.log('---------------------------------------------------');
            console.log('DEBUG: HTML Snippet (first 1000 chars):');
            console.log(historyHtml.substring(0, 1000));
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testScrape();
