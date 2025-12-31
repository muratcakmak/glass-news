# Quick Start: Free Image Generation

Get beautiful images for your articles **without spending money** on AI image generation.

---

## Default Setup (No Configuration)

The API works out of the box with **DiceBear** (free, unlimited):

```bash
# Just enable image generation - uses DiceBear automatically
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["hackernews"], "count": 2, "generateImage": true}'
```

**Result:** Pattern-based, modern-looking thumbnails (shapes, rings, pixel-art, etc.)

---

## Upgrade to Unsplash (Better Free Images)

For higher-quality, real photos instead of patterns:

### 1. Get Free Unsplash API Key

1. **Visit:** https://unsplash.com/developers
2. **Sign up** for a free developer account
3. **Create a new app:**
   - Name: "News Data API"
   - Description: "Generating thumbnails for news articles"
   - Accept the API terms
4. **Copy your "Access Key"** (looks like: `abc123xyz...`)

### 2. Set as Cloudflare Secret

```bash
bunx wrangler secret put UNSPLASH_API_KEY
# Paste your Access Key when prompted
```

### 3. Deploy

```bash
bunx wrangler deploy
```

### 4. Done!

Now your images will be high-quality photos from Unsplash (50/hour free tier).

```bash
# Same command, but now uses Unsplash photos
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["hackernews"], "count": 2, "generateImage": true}'
```

---

## What You Get

### With DiceBear (Default)
- ✅ Unlimited requests
- ✅ Modern, abstract designs
- ✅ Consistent aesthetic
- ❌ Not real photos

### With Unsplash (Free Upgrade)
- ✅ Real, professional photos
- ✅ Keyword-matched to article content
- ✅ High quality (1080p+)
- ⚠️ 50 images per hour limit

### Fallback Chain
The system automatically tries:
1. **Unsplash** (if API key set)
2. **DiceBear** (if Unsplash fails or rate limited)
3. **Lorem Picsum** (if everything else fails)

---

## Rate Limits

| Service | Free Tier | Recommended Usage |
|---------|-----------|-------------------|
| DiceBear | Unlimited | MVP, small projects |
| Unsplash | 50/hour, 5k/month | Production (< 50 articles/hour) |
| Lorem Picsum | Unlimited | Fallback only |

---

## Checking Which Service Was Used

```bash
# View logs to see which image service was used
bunx wrangler tail

# Example output:
[ImageService] AI Images enabled: false
[ImageService] Using free image alternatives
[ImageService] Fetching from Unsplash with query: technology,software,development
✓ Generated image for hn-46446815
```

---

## When to Upgrade to AI Images

Consider paid AI image generation (Gemini) when:
- You need custom illustrations specific to each article
- You're generating >50 images/hour
- You want editorial-style, branded visuals
- You have budget for AI API costs (~$0.002/image)

**To enable AI images:**
```bash
bunx wrangler secret put ENABLE_AI_IMAGES
# Enter: true

bunx wrangler secret put GEMINI_API_KEY
# Enter: your-gemini-api-key

bunx wrangler deploy
```

---

## Summary

**Recommended setup for most users:**

1. **Start with default (DiceBear)** - No setup, works great
2. **Add Unsplash API key** - 5 minutes, much better images
3. **Upgrade to AI later** - Only when you need custom illustrations

**Total cost: $0** ✅
