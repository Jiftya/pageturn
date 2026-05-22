// api/upload-url.js
// Vercel serverless function — generates a presigned R2 upload URL + slug
// Called by the frontend before uploading a PDF

export const config = { runtime: 'edge' };

function generateSlug(length = 8) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let slug = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) slug += chars[b % chars.length];
  return slug;
}

async function hmacSha256(key, message) {
  const keyData = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signedHeaders(method, bucket, key, region, accessKey, secretKey, contentType) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateShort = dateStr.slice(0, 8);

  const host = `${bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${key}`;
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-date:${dateStr}\n`;
  const signedHeadersList = 'content-type;host;x-amz-date';

  // SHA-256 of empty body for presigned URL we'll use empty hash
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    method, canonicalUri, canonicalQueryString,
    canonicalHeaders, signedHeadersList, payloadHash
  ].join('\n');

  const credentialScope = `${dateShort}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256', dateStr, credentialScope,
    toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest)))
  ].join('\n');

  const kDate    = await hmacSha256(`AWS4${secretKey}`, dateShort);
  const kRegion  = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  return { host, dateStr, authorization };
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return new Response('Missing filename or contentType', { status: 400 });
  }

  const slug = generateSlug(8);
  const ext = filename.split('.').pop().toLowerCase();
  const objectKey = `books/${slug}.${ext}`;

  const {
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME, R2_PUBLIC_URL
  } = process.env;

  const region = 'auto';
  const bucket = R2_BUCKET_NAME;
  const { host, dateStr, authorization } = await signedHeaders(
    'PUT', bucket, objectKey, region,
    R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, contentType
  );

  const uploadUrl = `https://${host}/${objectKey}`;
  const publicUrl = `${R2_PUBLIC_URL}/${objectKey}`;

  return new Response(JSON.stringify({
    slug,
    uploadUrl,
    publicUrl,
    headers: {
      'Content-Type': contentType,
      'x-amz-date': dateStr,
      'Authorization': authorization,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
