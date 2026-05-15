import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const res = await fetch(`https://api.deezer.com/track/${id}`);
  if (!res.ok) return Response.json({ error: 'not found' }, { status: 404 });
  const data = await res.json();
  return Response.json({ previewUrl: data.preview as string });
}
