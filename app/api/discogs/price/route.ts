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
        // Price suggestions for different conditions
        const url = `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`;

        const res = await fetch(url, {
            headers: {
                'Authorization': `Discogs token=${token}`,
                'User-Agent': 'ByeByeSystem/0.1'
            }
        });

        if (!res.ok) {
            // Some releases might not have price suggestions
            if (res.status === 404) {
                return Response.json({ error: 'no_suggestions' }, { status: 404 });
            }
            return Response.json({ error: 'discogs_api_error' }, { status: res.status });
        }

        const data = await res.json();
        return Response.json(data);
    } catch (e) {
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
