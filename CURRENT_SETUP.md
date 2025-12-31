# Current Setup - Unsplash Stock Photos

**Status:** ✅ Active and working
**Last Updated:** 2025-12-31

---

## Image Generation

**Service:** Unsplash (Free Stock Photos)
**Cost:** $0
**Configuration:** `ENABLE_AI_IMAGES = "false"` + `UNSPLASH_API_KEY` (set as secret)

### How It Works

1. When you crawl with `generateImage: true`, the system fetches high-quality stock photos from Unsplash
2. Images are matched to article content based on keywords extracted from the title
3. Direct Unsplash CDN URLs are returned (no download/upload needed)
4. No storage costs - images served directly from Unsplash

### Rate Limits

**Free Tier:**
- 50 requests per hour
- 5,000 requests per month

If rate limited, the system automatically falls back to DiceBear patterns.

---

## Architecture

### Two Separate Flows

**1. AI Images (ENABLE_AI_IMAGES="true"):**
```
Generate Blob → Upload to R2 → Return R2 URL
```
- Costs money (Gemini API)
- Custom editorial-style illustrations
- Stored in your R2 bucket

**2. Free Services (ENABLE_AI_IMAGES="false", default):**
```
Generate URL → Return Direct URL
```
- $0 cost
- Unsplash stock photos (if API key set)
- Fallback to DiceBear patterns
- No storage needed

---

## Testing

### Generate images during crawl:
```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Authorization: Bearer JcB6Lrb1nfdWe1rMN6UBmy3MceziR+4WWR2QiME80hM=" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["hackernews"], "count": 2, "generateImage": true}'
```

### Generate image for existing article:
```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/generate-image \
  -H "Authorization: Bearer JcB6Lrb1nfdWe1rMN6UBmy3MceziR+4WWR2QiME80hM=" \
  -H "Content-Type: application/json" \
  -d '{"articleId": "hackernews-46446815"}'
```

**Response:**
```json
{
  "success": true,
  "articleId": "hackernews-46446815",
  "thumbnailUrl": "https://images.unsplash.com/photo-1744044156149-656a625e8a93?..."
}
```

---

## Environment Variables

```toml
# wrangler.toml
[vars]
ENABLE_AI_IMAGES = "false"  # Use free services (Unsplash)
```

```bash
# Secrets (already set)
UNSPLASH_API_KEY = "7kkInCybo0-lCwa9J3LXKSFMnVEVhKPh5C4FKHM9Dpo"
```

---

## Waterfall Strategy

The system tries image sources in this order:

1. **Unsplash** (if API key set) - High-quality photos
   ↓ (if rate limited or fails)
2. **DiceBear** (always works) - Pattern-based designs
   ↓ (if fails, rare)
3. **Lorem Picsum** (last resort) - Random stock photos

---

## Endpoints

### Text Transformation Only
```bash
POST /api/admin/crawl
{
  "sources": ["hackernews"],
  "count": 2,
  "transform": true,        // AI text transformation
  "generateImage": false    // Skip images
}
```

### Image Generation Only
```bash
POST /api/admin/crawl
{
  "sources": ["hackernews"],
  "count": 2,
  "transform": false,       // Skip text transformation
  "generateImage": true     // Generate Unsplash images
}
```

### Full Pipeline
```bash
POST /api/admin/crawl
{
  "sources": ["hackernews"],
  "count": 2,
  "transform": true,
  "generateImage": true
}
```

### Standalone Image Generation
```bash
# Single article
POST /api/admin/generate-image
{
  "articleId": "hackernews-46446815"
}

# Batch by source
POST /api/admin/generate-image
{
  "source": "hackernews",
  "limit": 10
}
```

---

## Example Results

Recent crawl with `generateImage: true`:

```json
{
  "id": "hackernews-46446815",
  "title": "I canceled my book deal",
  "thumbnailUrl": "https://images.unsplash.com/photo-1744044156149-656a625e8a93?..."
}
```

Beautiful, high-quality images matched to article content! 📸

---

## Switching to AI Images (Optional)

If you want custom AI-generated illustrations instead:

```bash
# Enable AI images
bunx wrangler secret put ENABLE_AI_IMAGES
# Enter: true

# Deploy
bunx wrangler deploy
```

**Cost:** ~$0.002 per image (Gemini)
**Result:** Custom editorial-style illustrations

---

## Documentation

- **Setup Guide:** `docs/QUICKSTART_FREE_IMAGES.md`
- **Full Guide:** `docs/IMAGE_GENERATION.md`
- **API Docs:** https://news-data.omc345.workers.dev/docs

---

**Bottom Line:** You're all set with free, high-quality Unsplash stock photos! 50 images/hour is plenty for development and small-scale production. 🚀
