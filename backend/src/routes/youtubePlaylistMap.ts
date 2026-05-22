import { Router } from 'express';
import { allSongs as songs } from '../songs.js';

const router = Router();

interface YTSearchItem {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string };
}

// Cache en módulo para no repetir llamadas a la API entre requests
const cache = new Map<string, string>(); // songId → videoId
// Videos confirmados como no-embeddables (no volver a incluirlos)
const nonEmbeddable = new Set<string>();

async function getEmbeddableIds(videoIds: string[], apiKey: string): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set();
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'status');
  url.searchParams.set('id', videoIds.join(','));
  url.searchParams.set('key', apiKey);
  try {
    const r = await fetch(url.toString());
    if (!r.ok) return new Set(videoIds); // Si falla la verificación, asumir embeddable
    const data = await r.json() as { items: Array<{ id: string; status: { embeddable: boolean } }> };
    if (!data.items?.length) {
      console.warn('[YT playlist-map] videos.list devolvió 0 items — asumiendo todos embeddables');
      return new Set(videoIds);
    }
    return new Set(
      (data.items ?? []).filter((item) => item.status.embeddable).map((item) => item.id)
    );
  } catch {
    return new Set(videoIds);
  }
}

async function resolveVideoId(songId: string, artist: string, title: string, apiKey: string): Promise<string | null> {
  if (cache.has(songId)) return cache.get(songId)!;

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoCategoryId', '10');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('q', `${artist} ${title}`);
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('key', apiKey);

  const r = await fetch(url.toString());
  if (!r.ok) {
    console.warn(`[YT playlist-map] API error ${r.status} para "${artist} - ${title}"`);
    return null;
  }

  const data = await r.json() as { items: YTSearchItem[] };
  console.log(`[YT playlist-map] "${artist} - ${title}"`, data.items);

  const videoId = data.items?.[0]?.id?.videoId ?? null;
  if (videoId) cache.set(songId, videoId);
  return videoId;
}

router.get('/', async (req, res) => {
  const packId = typeof req.query.packId === 'string' ? req.query.packId.trim() : '';
  if (!packId) { res.status(400).json({ error: 'Falta el parámetro packId' }); return; }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'YOUTUBE_API_KEY no configurada' }); return; }

  const pack = songs.filter((s) => s.packId === packId);
  if (pack.length === 0) { res.status(404).json({ error: `Pack "${packId}" no encontrado` }); return; }

  const map: Record<string, string> = {};

  // Primero volcar los IDs ya conocidos
  for (const song of pack) {
    if (song.providerIds?.youtube) {
      map[song.id] = song.providerIds.youtube;
      cache.set(song.id, song.providerIds.youtube);
    }
  }

  // Resolver en serie los que faltan (evita saturar la API)
  const missing = pack.filter((s) => !s.providerIds?.youtube);
  for (const song of missing) {
    try {
      const videoId = await resolveVideoId(song.id, song.artist, song.title, apiKey);
      if (videoId) map[song.id] = videoId;
    } catch (err) {
      console.warn(`[YT playlist-map] Error resolviendo "${song.artist} - ${song.title}":`, err);
    }
  }

  // Verificar en batch qué videos permiten embedding y eliminar los que no
  const videoIds = Object.values(map).filter((id) => !nonEmbeddable.has(id));
  const embeddable = await getEmbeddableIds(videoIds, apiKey);
  for (const [songId, videoId] of Object.entries(map)) {
    if (!embeddable.has(videoId)) {
      console.warn(`[YT playlist-map] "${videoId}" no permite embedding — excluido`);
      nonEmbeddable.add(videoId);
      delete map[songId];
      cache.delete(songId); // Permitir re-búsqueda con otro video en el futuro
    }
  }

  res.json({ map });
});

export default router;
