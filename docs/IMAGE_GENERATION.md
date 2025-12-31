# Image Generation Guide

This document explains how to configure image generation for your articles using either AI (paid) or free alternatives.

---

## Quick Start

By default, the API uses **free image services** to generate thumbnails. No configuration needed!

```bash
# Images are generated using DiceBear (free, unlimited)
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["hackernews"], "count": 2, "generateImage": true}'
```

---

## Configuration Options

### Option 1: Free Services (Default, Recommended for Development)

**No setup required!** The system automatically uses:

1. **Unsplash** (if API key provided) - High-quality curated photos
2. **DiceBear** (always available) - Pattern-based avatars
3. **Lorem Picsum** (fallback) - Random stock photos

**Pros:**
- ✅ Zero cost
- ✅ Unlimited requests (DiceBear)
- ✅ No setup required
- ✅ Good enough for development

**Cons:**
- ❌ Images not specifically related to article content
- ❌ Less professional looking

### Option 2: AI-Generated Images (Paid, Production Quality)

Uses Google Gemini 2.5 Flash to generate custom images based on article content.

**Setup:**

```bash
# 1. Set the AI images flag
wrangler secret put ENABLE_AI_IMAGES
# Enter: true

# 2. Ensure you have Gemini API key set
wrangler secret put GEMINI_API_KEY
# Enter: your-gemini-api-key
```

**Pros:**
- ✅ Custom images generated for each article
- ✅ Professional, editorial-style illustrations
- ✅ Contextually relevant to content

**Cons:**
- ❌ Costs money (Gemini API charges)
- ❌ Slower generation time

---

## Free Service Details

### 1. Unsplash (Optional, Best Quality)

**Setup:**

```bash
# 1. Get free API key from https://unsplash.com/developers
# 2. Set as secret
wrangler secret put UNSPLASH_API_KEY
# Enter: your-unsplash-access-key
```

**Limits:**
- 50 requests per hour (free tier)
- 5,000 requests per month (free tier)

**Quality:**
- High-quality, professionally shot photos
- Automatically selects images based on article keywords
- Best for production if rate limits work for you

### 2. DiceBear (Always Available)

**No setup required!**

**Limits:**
- Unlimited requests
- Always works

**Quality:**
- Pattern-based, abstract designs
- Consistent, professional look
- Modern aesthetic styles (shapes, rings, pixel-art)

**Example styles:**
- `shapes` - Geometric patterns
- `rings` - Circular designs
- `pixel-art` - Retro pixel style
- `identicon` - GitHub-style avatars
- `thumbs` - Thumbprint patterns

### 3. Lorem Picsum (Last Resort)

**No setup required!**

**Limits:**
- Unlimited requests
- Always works

**Quality:**
- Random stock photos
- Not related to article content
- Basic fallback option

---

## Image Generation Waterfall

The system tries sources in this order:

```
1. AI Images (if ENABLE_AI_IMAGES=true)
   ↓ (if disabled or fails)
2. Unsplash (if UNSPLASH_API_KEY set)
   ↓ (if not set or rate limited)
3. DiceBear (always works)
   ↓ (if fails, rare)
4. Lorem Picsum (last resort)
```

---

## Environment Variables

Add these to `wrangler.toml` or set as secrets:

```toml
[vars]
# Set to "false" or omit to use free services (default)
# Set to "true" to enable AI image generation (costs money)
ENABLE_AI_IMAGES = "false"
```

```bash
# Optional: For better free images
wrangler secret put UNSPLASH_API_KEY

# Required for AI images (if ENABLE_AI_IMAGES=true)
wrangler secret put GEMINI_API_KEY
wrangler secret put ENABLE_AI_IMAGES
```

---

## Usage Examples

### Generate Images During Crawl

```bash
# With free services (default)
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["hackernews"],
    "count": 5,
    "generateImage": true
  }'
```

### Generate Images for Existing Articles

```bash
# Single article
curl -X POST https://news-data.omc345.workers.dev/api/admin/generate-image \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"articleId": "hn-46446815"}'

# Batch by source
curl -X POST https://news-data.omc345.workers.dev/api/admin/generate-image \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "hackernews", "limit": 10}'
```

---

## Cost Comparison

| Service | Cost | Quality | Rate Limit | Recommended For |
|---------|------|---------|------------|-----------------|
| **DiceBear** | Free | Good | Unlimited | Development, MVP |
| **Unsplash** | Free | Excellent | 50/hour | Production (small scale) |
| **Lorem Picsum** | Free | Basic | Unlimited | Fallback only |
| **Gemini AI** | ~$0.002/image | Custom | Depends on quota | Production (custom content) |

---

## Recommended Setup

### Development / MVP
```bash
# Just use defaults - DiceBear is fine!
# No setup needed
```

### Production (Budget)
```bash
# Get Unsplash API key for better images
wrangler secret put UNSPLASH_API_KEY
# Keep ENABLE_AI_IMAGES=false
```

### Production (Premium)
```bash
# Enable AI images for custom illustrations
wrangler secret put ENABLE_AI_IMAGES
# Enter: true
wrangler secret put GEMINI_API_KEY
# Enter: your-gemini-key
```

---

## Monitoring

Check which image service was used in logs:

```bash
wrangler tail

# Look for:
[ImageService] AI Images enabled: false
[ImageService] Using free image alternatives
[ImageService] Fetching from DiceBear: shapes
```

---

## Troubleshooting

**Problem:** No images generated

**Solution:**
1. Check logs: `wrangler tail`
2. Verify DiceBear is accessible (should always work)
3. If using Unsplash, check API key is set

**Problem:** Images not related to content

**Solution:**
- This is expected with free services
- Either accept it for MVP, or enable AI images
- Unsplash does keyword matching, but it's basic

**Problem:** Rate limit errors from Unsplash

**Solution:**
- Wait an hour (50 requests/hour limit)
- System automatically falls back to DiceBear
- Consider enabling AI images or staying with DiceBear

---

## Getting API Keys

### Unsplash (Free)
1. Go to https://unsplash.com/developers
2. Register as a developer
3. Create a new app
4. Copy "Access Key"
5. `wrangler secret put UNSPLASH_API_KEY`

### Gemini (Paid)
1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. `wrangler secret put GEMINI_API_KEY`

---

## Best Practices

1. **Start with free services** - DiceBear works great for MVPs
2. **Add Unsplash later** - If you need better images without cost
3. **Enable AI last** - Only when you need custom, contextual images
4. **Monitor costs** - If using AI, track your Gemini API usage
5. **Cache images** - R2 stores images permanently, no regeneration needed

---

**Current Recommendation:** Use default free services (DiceBear) until you have paying users, then upgrade to Unsplash or AI images based on budget.
