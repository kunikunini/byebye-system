import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const catno = searchParams.get('catno');
    const q = searchParams.get('q');
    const artist = searchParams.get('artist');
    const title = searchParams.get('title');
    const token = process.env.DISCOGS_TOKEN;

    if (!catno && !q && !artist && !title) {
        return Response.json({ error: 'missing_query' }, { status: 400 });
    }

    if (!token) {
        // Fallback or error if token is missing
        return Response.json({ error: 'missing_token' }, { status: 500 });
    }

    try {
        let url = `https://api.discogs.com/database/search?`;
        if (catno) url += `catno=${encodeURIComponent(catno)}&`;
        if (q) url += `q=${encodeURIComponent(q)}&`;
        if (artist) url += `artist=${encodeURIComponent(artist)}&`;
        if (title) url += `title=${encodeURIComponent(title)}&`;

        const res = await fetch(url, {
            headers: {
                'Authorization': `Discogs token=${token}`,
                'User-Agent': 'ByeByeSystem/0.1'
            }
        });

        if (!res.ok) {
            return Response.json({ error: 'discogs_api_error' }, { status: res.status });
        }

        const data = await res.json();
        const results = (data.results || []).slice(0, 5); // Limit to top 5

        if (results.length === 0) {
            return Response.json({ results: [] });
        }

        const mappedResults = results.map((top: any) => {
            // Discogs titles are usually "Artist - Title"
            const [artist, title] = top.title.split(' - ').map((s: string) => s.trim());
            return {
                title: title || top.title,
                artist: artist || '',
                catalogNo: top.catno || catno,
                year: top.year || '',
                label: top.label?.[0] || '',
                format: top.format?.[0] || '',
                resourceUrl: top.resource_url || '',
                thumb: top.thumb || '',
            };
        });

        return Response.json({ results: mappedResults });
    } catch (e) {
        return Response.json({ error: 'internal_error' }, { status: 500 });
    }
}
