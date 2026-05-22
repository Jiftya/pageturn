// api/register.js
// Stores slug → R2 public URL mapping in Vercel KV
// TTL: 365 days (configurable)

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { slug, url } = await req.json();
  if (!slug || !url) return new Response('Missing slug or url', { status: 400 });

  await kvSet(`book:${slug}`, url, 60 * 60 * 24 * 365); // 1 year TTL

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function kvSet(key, value, ttlSeconds) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL) return;
  await fetch(`${KV_REST_API_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ value, ex: ttlSeconds })
  });
}
