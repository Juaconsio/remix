import { NextRequest } from 'next/server';

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars are required');
  }
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    next: { revalidate: 3500 },
  });
  if (!res.ok) throw new Error('Failed to get Spotify token');
  const data = await res.json();
  return data.access_token as string;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let token: string;
  try {
    token = await getSpotifyToken();
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Spotify auth failed' },
      { status: 500 }
    );
  }

  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return Response.json({ error: 'track not found' }, { status: 404 });
  const data = await res.json();
  return Response.json({ previewUrl: (data.preview_url as string | null) ?? null });
}
