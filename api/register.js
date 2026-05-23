// api/register.js
// Stores slug → R2 public URL mapping in Vercel KV
// TTL: 365 days (configurable)

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { slug, url } = await req.json();
  if (!slug || !url) return new Response('Missing slug or url', { status: 400 });

  const ok = await kvSet(`book:${slug}`, url, 60 * 60 * 24 * 365); // 1 year TTL
  if (!ok) return new Response('KV write failed', { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function kvSet(key, value, ttlSeconds) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL) {
    console.error('KV_REST_API_URL is not set');
    return false;
  }
  const res = await fetch(
    `${KV_REST_API_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${ttlSeconds}`,
    {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    }
  );
  if (!res.ok) {
    console.error('KV set failed:', res.status, await res.text());
    return false;
  }
  return true;
}
