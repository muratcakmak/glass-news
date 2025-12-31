# Testing Guide - Quick Start

## 🚀 Easiest Way: Swagger UI (No Code Required!)

**Just open this URL in your browser:**
https://news-data.omc345.workers.dev/docs

You'll get an interactive Swagger UI where you can:
- ✅ See all API endpoints
- ✅ Click "Try it out" to test any endpoint
- ✅ View request/response examples
- ✅ No cURL, no Python, no setup needed!

### Alternative Documentation UIs

- **Swagger UI:** https://news-data.omc345.workers.dev/docs
- **ReDoc:** https://news-data.omc345.workers.dev/redoc
- **OpenAPI JSON:** https://news-data.omc345.workers.dev/openapi.json

---

## Quick Test Workflow (Using Swagger UI)

### 1. Open Swagger UI
Go to: https://news-data.omc345.workers.dev/docs

### 2. Test Crawling (No AI, Raw Only)

1. Find **POST /api/admin/crawl**
2. Click "Try it out"
3. Edit the request body:
   ```json
   {
     "sources": ["hackernews"],
     "count": 2
   }
   ```
4. Click "Execute"
5. See the response with article IDs

### 3. Test Transformation

1. Copy an article ID from step 2 (e.g., `hackernews-46446815`)
2. Find **POST /api/admin/transform**
3. Click "Try it out"
4. Edit request body:
   ```json
   {
     "articleId": "hackernews-46446815",
     "variants": ["default", "technical", "brief"]
   }
   ```
5. Click "Execute"
6. See all 3 transformed variants!

### 4. Get Article in Specific Style

1. Find **GET /api/articles/{id}**
2. Click "Try it out"
3. Enter article ID: `hackernews-46446815`
4. Set variant parameter: `technical`
5. Click "Execute"
6. See the technical version!

### 5. List Available Variants

1. Find **GET /api/articles/{id}/variants**
2. Click "Try it out"
3. Enter article ID
4. Click "Execute"
5. See: `["raw", "default", "technical", "brief"]`

---

## Alternative: cURL (If You Prefer Terminal)

### Test 1: Crawl
```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{"sources": ["hackernews"], "count": 2}'
```

### Test 2: Transform
```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -H "Content-Type: application/json" \
  -d '{"articleId": "hn-{ID}", "variants": ["default", "technical"]}'
```

### Test 3: Get Variant
```bash
curl "https://news-data.omc345.workers.dev/api/articles/hn-{ID}?variant=technical"
```

---

## No Python Needed!

~~We initially created a Jupyter notebook for testing, but Swagger UI is way better!~~

**Just use:** https://news-data.omc345.workers.dev/docs

It's interactive, visual, and requires zero setup. 🎉

---

## Key Endpoints to Test

| Endpoint | What it does | Try in Swagger |
|----------|-------------|----------------|
| `POST /api/admin/crawl` | Crawl articles (raw, no AI) | ✅ |
| `POST /api/admin/transform` | Transform with AI variants | ✅ |
| `GET /api/articles/{id}?variant=...` | Get specific variant | ✅ |
| `GET /api/articles/{id}/variants` | List available variants | ✅ |
| `GET /api/articles` | List all articles | ✅ |

---

## What You Get

### Variant Styles Available

- **raw** - Original article (no AI, no cost)
- **default** - General audience, engaging summary
- **technical** - Developer focus, deep-dive
- **casual** - Conversational, friendly tone
- **formal** - Professional, business style
- **brief** - Ultra-concise (2-3 sentences)

### Cost Control

```bash
# Free - no AI cost
POST /crawl {"sources": ["hackernews"], "count": 10}

# Only pay for what you transform
POST /transform {"articleId": "hn-123", "variant": "default"}
```

---

## Troubleshooting

**Swagger UI shows empty?**
- Wait a few seconds for the page to load
- Check: https://news-data.omc345.workers.dev/openapi.json should return JSON

**Article not found?**
```bash
# List all articles first
curl https://news-data.omc345.workers.dev/api/articles
```

**Transformation returns same content?**
- Some articles have very short content that doesn't get transformed
- Try with a different HackerNews article (longer content)

---

## Next Steps

1. ✅ Test with Swagger UI: https://news-data.omc345.workers.dev/docs
2. ✅ Try different variant styles
3. ✅ Compare transformations side-by-side
4. ✅ Integrate into your frontend

---

## Documentation

- **Variant System:** [docs/VARIANT_SYSTEM.md](docs/VARIANT_SYSTEM.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API Reference:** [docs/API.md](docs/API.md)
