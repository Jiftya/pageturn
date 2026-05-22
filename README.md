# PageTurn — Shareable PDF Flipbook

Upload a PDF → get a shareable link like `yoursite.vercel.app/book/abc12345`

## Architecture

```
Browser → Vercel (index.html + 3 API routes) → Cloudflare R2 (PDF storage)
                                              → Vercel KV  (slug → URL map)
```

## Setup (15–20 minutes)

### 1. Cloudflare R2 (storage)

1. Sign up at [cloudflare.com](https://cloudflare.com) (free)
2. Go to **R2 Object Storage** → Create bucket → name it `flipbooks`
3. In the bucket → **Settings** → **Public access** → Allow public access
   - Copy the public URL: `https://pub-xxxx.r2.dev`
4. Go to **R2** → **Manage R2 API Tokens** → Create token
   - Permissions: Object Read & Write on bucket `flipbooks`
   - Copy: Account ID, Access Key ID, Secret Access Key
5. In bucket → **Settings** → **CORS Policy** → paste:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel login

# From this project folder:
vercel

# Set environment variables:
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME        # flipbooks
vercel env add R2_PUBLIC_URL         # https://pub-xxxx.r2.dev
```

### 3. Vercel KV (slug storage)

1. In Vercel dashboard → your project → **Storage** tab
2. Create a **KV** store (free tier: 256MB, plenty for slugs)
3. Click **Connect** — Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`

### 4. Redeploy

```bash
vercel --prod
```

Your site is live at `your-project.vercel.app` 🎉

---

## How it works

1. User drops a PDF → frontend calls `/api/upload-url`
2. API generates a random 8-char slug (`abc12345`) and a signed R2 PUT URL
3. Browser uploads PDF directly to R2 (no data through Vercel)
4. API stores `book:abc12345 → https://pub-xxxx.r2.dev/books/abc12345.pdf` in KV
5. User gets shareable URL: `yoursite.vercel.app/book/abc12345`
6. Visitor opens link → frontend calls `/api/resolve?slug=abc12345` → gets R2 URL → loads PDF

## Pricing

| Service | Free tier | Cost after |
|---------|-----------|------------|
| Cloudflare R2 | 10 GB storage, 0 egress | $0.015/GB/mo |
| Vercel | Unlimited bandwidth | — |
| Vercel KV | 256 MB (millions of slugs) | $0.20/100k ops |

For a typical use case (hundreds of PDFs, moderate traffic) this runs at **$0/month**.

## Custom domain

```bash
vercel domains add yourdomain.com
```

Then update `R2_PUBLIC_URL` if you also add a custom domain to R2.
