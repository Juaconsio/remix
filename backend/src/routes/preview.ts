import { Router } from 'express';

const router = Router();

router.get('/deezer/:id', async (req, res) => {
  const { id } = req.params;
  const r = await fetch(`https://api.deezer.com/track/${id}`);
  if (!r.ok) { res.status(404).json({ error: 'not found' }); return; }
  const data = await r.json() as { preview: string };
  res.json({ previewUrl: data.preview });
});

let spotifyTokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (spotifyTokenCache && Date.now() < spotifyTokenCache.expiresAt) {
    return spotifyTokenCache.token;
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET required');
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('Spotify auth failed');
  const data = await r.json() as { access_token: string; expires_in: number };
  spotifyTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

router.get('/spotify/:id', async (req, res) => {
  const { id } = req.params;
  let token: string;
  try {
    token = await getSpotifyToken();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Spotify auth failed' });
    return;
  }
  const r = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) { res.status(404).json({ error: 'track not found' }); return; }
  const data = await r.json() as { preview_url: string | null };
  res.json({ previewUrl: data.preview_url ?? null });
});

export default router;
