// api/resolve.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return new Response('Missing slug', { status: 400 });

  const url = await kvGet(slug);
  if (!url) return new Response('Not found', { status: 404 });

  return new Response(JSON.stringify({ url }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function kvGet(key) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL) {
    console.error('KV_REST_API_URL is not set');
    return null;
  }
  const res = await fetch(`${KV_REST_API_URL}/get/book:${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
  });
  const data = await res.json();
  return data.result || null;
}
