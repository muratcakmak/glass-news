# Article Variant System

## Overview

The variant system provides a flexible, cost-effective approach to AI-powered article transformation. Instead of automatically transforming every article during crawling, articles are stored in their raw form and transformed on-demand with different styles.

## Benefits

1. **Cost Control** - Transform only when needed, saving AI API costs
2. **Multi-tenant Support** - Different clients can request different transformation styles
3. **Experimentation** - A/B test different transformation approaches
4. **Source of Truth** - Original articles always preserved
5. **Caching** - Variants are cached after first generation

## Architecture

### Storage Structure

```
R2 Bucket:
├── articles/
│   └── {source}/
│       └── {articleId}/
│           ├── {articleId}.json              # Original article (root level)
│           └── variants/
│               ├── default.json              # Default transformation
│               ├── technical.json            # Technical deep-dive
│               ├── casual.json               # Conversational style
│               ├── formal.json               # Professional tone
│               └── brief.json                # Ultra-concise summary
└── thumbnails/
    └── {articleId}.png
```

### Variant Types

| Variant | Description | Use Case |
|---------|-------------|----------|
| **raw** | Original, untransformed content | API consumers, data analysis |
| **default** | Engaging, informative summary | General readers, news feed |
| **technical** | Deep-dive with technical details | Developer community, expert audience |
| **casual** | Friendly, conversational tone | Social media, casual browsing |
| **formal** | Professional, academic style | Business reports, formal contexts |
| **brief** | Ultra-concise (2-3 sentences) | Mobile notifications, quick scan |

## API Endpoints

### 1. Crawl Articles (Raw Only)

**Endpoint:** `POST /api/admin/crawl`

**Purpose:** Crawl and store articles WITHOUT AI transformation

#### Basic Example - Raw HackerNews Crawl

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["hackernews"],
    "count": 2
  }'
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "transformed": false,
  "variant": "raw",
  "status": "completed",
  "articles": [
    {
      "id": "hn-42345678",
      "source": "hackernews",
      "originalTitle": "New JavaScript Framework Announced",
      "originalContent": "Full article content...",
      "originalUrl": "https://news.ycombinator.com/item?id=42345678",
      "crawledAt": "2025-12-31T10:00:00.000Z",
      "language": "en"
    }
  ]
}
```

#### Crawl with Immediate Transformation

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["hackernews"],
    "count": 2,
    "transform": true,
    "variant": "default"
  }'
```

#### Crawl Multiple Sources

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["hackernews", "t24", "eksisozluk"],
    "count": 1
  }'
```

#### Background Crawling

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["hackernews"],
    "count": 5,
    "sync": false
  }'
```

**Response:**
```json
{
  "success": true,
  "status": "processing",
  "message": "Crawling 1 sources in background",
  "transform": false,
  "variant": "raw"
}
```

---

### 2. Transform Existing Articles

**Endpoint:** `POST /api/admin/transform`

**Purpose:** Apply AI transformation to already-crawled articles

#### Transform Single Article

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "hn-42345678",
    "variant": "technical"
  }'
```

**Response:**
```json
{
  "success": true,
  "articleId": "hn-42345678",
  "variants": [
    {
      "articleId": "hn-42345678",
      "source": "hackernews",
      "variant": "technical",
      "title": "Deep Dive: New JavaScript Framework Architecture",
      "content": "This framework introduces several novel concepts...",
      "metadata": {
        "variant": "technical",
        "model": "x-ai/grok-4.1-fast",
        "transformedAt": "2025-12-31T10:05:00.000Z"
      }
    }
  ]
}
```

#### Generate Multiple Variants

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "hn-42345678",
    "variants": ["default", "technical", "brief"]
  }'
```

**Response:**
```json
{
  "success": true,
  "articleId": "hn-42345678",
  "variants": [
    {
      "variant": "default",
      "title": "New JavaScript Framework Makes Waves",
      "content": "A new framework promises to simplify...",
      ...
    },
    {
      "variant": "technical",
      "title": "Deep Dive: New JavaScript Framework Architecture",
      "content": "This framework introduces several novel concepts...",
      ...
    },
    {
      "variant": "brief",
      "title": "New JS Framework Released",
      "content": "Framework simplifies state management with innovative approach.",
      ...
    }
  ]
}
```

#### Batch Transform by Article IDs

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -H "Content-Type: application/json" \
  -d '{
    "articleIds": ["hn-12345", "hn-67890", "t24-98765"],
    "variant": "default"
  }'
```

#### Batch Transform by Source

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -H "Content-Type: application/json" \
  -d '{
    "source": "hackernews",
    "limit": 10,
    "variant": "casual"
  }'
```

**Response:**
```json
{
  "success": true,
  "source": "hackernews",
  "count": 10,
  "results": [
    {
      "articleId": "hn-12345",
      "variants": [...]
    },
    ...
  ]
}
```

---

### 3. Get Articles with Variant

**Endpoint:** `GET /api/articles/:id`

**Purpose:** Fetch article in specific variant (creates variant if doesn't exist)

#### Get Raw Article

```bash
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678"
# or explicitly
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=raw"
```

**Response:**
```json
{
  "id": "hn-42345678",
  "source": "hackernews",
  "originalTitle": "New JavaScript Framework Announced",
  "originalContent": "Full article content...",
  "originalUrl": "https://news.ycombinator.com/item?id=42345678",
  "crawledAt": "2025-12-31T10:00:00.000Z",
  "language": "en"
}
```

#### Get Default Variant

```bash
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=default"
```

**Response:**
```json
{
  "articleId": "hn-42345678",
  "source": "hackernews",
  "variant": "default",
  "title": "New JavaScript Framework Makes Waves",
  "content": "A new framework promises to simplify modern web development...",
  "thumbnailUrl": "/thumbnails/hn-42345678.png",
  "tags": ["javascript", "framework", "webdev"],
  "metadata": {
    "variant": "default",
    "model": "x-ai/grok-4.1-fast",
    "transformedAt": "2025-12-31T10:05:00.000Z"
  }
}
```

#### Get Technical Variant

```bash
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=technical"
```

---

### 4. List Available Variants

**Endpoint:** `GET /api/articles/:id/variants`

**Purpose:** See which variants have been generated for an article

```bash
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678/variants"
```

**Response:**
```json
{
  "articleId": "hn-42345678",
  "variants": ["raw", "default", "technical"],
  "count": 3
}
```

---

### 5. Get Specific Variant (REST-style)

**Endpoint:** `GET /api/articles/:id/variants/:variant`

**Purpose:** Alternative way to fetch a specific variant

```bash
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678/variants/technical"
```

---

## Client Use Cases

### Use Case 1: News Aggregator (Mobile App)

**Requirements:**
- Display raw titles in list view
- Show brief summaries on tap
- Load full default variant on article open

```bash
# 1. List articles (raw)
curl "https://news-data.omc345.workers.dev/api/articles?limit=20"

# 2. Get brief variant for preview
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=brief"

# 3. Get full article with default transformation
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=default"
```

### Use Case 2: Developer Community Platform

**Requirements:**
- Technical deep-dives for HN articles
- Raw content for other sources

```bash
# For HackerNews articles
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=technical"

# For other sources
curl "https://news-data.omc345.workers.dev/api/articles/t24-12345?variant=raw"
```

### Use Case 3: Multi-language News Platform

**Requirements:**
- Casual tone for Turkish articles
- Formal tone for English articles

```bash
# Turkish article (casual)
curl "https://news-data.omc345.workers.dev/api/articles/t24-12345?variant=casual"

# English article (formal)
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=formal"
```

### Use Case 4: Business Intelligence Dashboard

**Requirements:**
- Raw data for analysis
- Batch transform top articles daily

```bash
# 1. Crawl daily (raw only)
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -d '{"sources": ["all"], "count": 100}'

# 2. Batch transform top 10
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -d '{"source": "hackernews", "limit": 10, "variant": "default"}'
```

---

## Complete Workflow Example

### Scenario: Launch New Feature with Different Tones

```bash
# Step 1: Crawl latest HackerNews (raw only, no AI cost)
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["hackernews"],
    "count": 5
  }'

# Response gives us article IDs: ["hn-101", "hn-102", ...]

# Step 2: Generate multiple variants for A/B testing
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "hn-101",
    "variants": ["default", "casual", "formal"]
  }'

# Step 3: Clients request different variants
# Mobile app (casual)
curl "https://news-data.omc345.workers.dev/api/articles/hn-101?variant=casual"

# Desktop app (formal)
curl "https://news-data.omc345.workers.dev/api/articles/hn-101?variant=formal"

# Email newsletter (brief)
curl "https://news-data.omc345.workers.dev/api/articles/hn-101?variant=brief"

# Step 4: Check what variants exist
curl "https://news-data.omc345.workers.dev/api/articles/hn-101/variants"
# Response: ["raw", "default", "casual", "formal", "brief"]
```

---

## Migration Notes

### Backward Compatibility

Old endpoints still work but will return raw articles by default:
```bash
# Old way (still works, returns raw)
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678"

# New way (specify variant)
curl "https://news-data.omc345.workers.dev/api/articles/hn-42345678?variant=default"
```

### Deprecated Fields

In `NewsArticle` type:
- `transformedTitle` - Use variants instead
- `transformedContent` - Use variants instead

These fields are still populated by legacy transformation code but will be removed in future versions.

---

## Cost Optimization Tips

1. **Crawl Raw Only**
   ```bash
   # No AI costs during crawling
   { "sources": ["all"], "count": 100 }
   ```

2. **Transform Popular Articles**
   ```bash
   # Only transform top 10 daily
   { "source": "hackernews", "limit": 10, "variant": "default" }
   ```

3. **Lazy Loading**
   ```bash
   # Transform on first request (cached for subsequent requests)
   GET /api/articles/hn-101?variant=default
   ```

4. **Batch Transformation**
   ```bash
   # Transform multiple articles in one request
   { "articleIds": ["hn-1", "hn-2", "hn-3"], "variant": "default" }
   ```

---

## Testing Recommendations

See [API_TESTING.md](./API_TESTING.md) for Python notebook and detailed testing instructions.

**Quick Test:**
```bash
# 1. Crawl one article
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{"sources": ["hackernews"], "count": 1}'

# 2. Get article ID from response, then test variants
curl "https://news-data.omc345.workers.dev/api/articles/hn-{ID}?variant=raw"
curl "https://news-data.omc345.workers.dev/api/articles/hn-{ID}?variant=default"
curl "https://news-data.omc345.workers.dev/api/articles/hn-{ID}?variant=technical"
```

---

## Sources

- [chanfana - OpenAPI for Hono](https://github.com/cloudflare/chanfana)
- [Hono with Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Cloudflare Workers AI Jupyter Notebook](https://developers.cloudflare.com/workers-ai/guides/tutorials/explore-workers-ai-models-using-a-jupyter-notebook/)
