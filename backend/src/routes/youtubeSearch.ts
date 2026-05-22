import { Router } from 'express';

const router = Router();

interface YTSearchItem {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string; publishedAt: string };
}

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) { res.status(400).json({ error: 'Falta el parámetro q' }); return; }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'YOUTUBE_API_KEY no configurada' }); return; }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoCategoryId', '10'); // Music
  url.searchParams.set('maxResults', '10');
  url.searchParams.set('q', q);
  url.searchParams.set('key', apiKey);

  try {
    const r = await fetch(url.toString());
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('[YouTube Search] API error', r.status, err);
      res.status(502).json({ error: 'Error de YouTube Data API', details: err });
      return;
    }
    const data = await r.json() as { items: YTSearchItem[] };
    const tracks = (data.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        year: item.snippet.publishedAt.slice(0, 4),
        previewUrl: item.id.videoId,
      }));
    res.json({ tracks });
  } catch {
    res.status(502).json({ error: 'Error de red al contactar YouTube Data API' });
  }
});

export default router;
