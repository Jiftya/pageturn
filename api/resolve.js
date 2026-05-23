// api/resolve.js
// Looks up slug → R2 public URL
// Uses Vercel KV (free tier) for the slug→URL mapping

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
  // Vercel KV REST API (included in Vercel free tier)
  const { UPSTASH_REDIS_REST_URL: KV_REST_API_URL, UPSTASH_REDIS_REST_TOKEN: KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL) return null;
  const res = await fetch(`${KV_REST_API_URL}/get/book:${key}`, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
  });
  const data = await res.json();
  return data.result || null;
}
