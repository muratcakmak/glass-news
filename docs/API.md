# API Documentation

Base URL: `https://news-data.workers.dev` (or your custom domain)

All endpoints return JSON responses with CORS enabled.

## Articles

### List Articles

Get a list of articles with optional filtering.

```http
GET /api/articles?source={source}&limit={limit}
```

**Query Parameters:**
- `source` (optional): Filter by source (`hackernews`, `t24`, `eksisozluk`, `reddit`, `wikipedia`)
- `limit` (optional): Number of articles to return (default: 20, max: 100)

**Response:**
```json
{
  "articles": [
    {
      "id": "hackernews-12345",
      "source": "hackernews",
      "originalTitle": "Show HN: My Project",
      "originalContent": "...",
      "transformedTitle": "A Cool New Project",
      "transformedContent": "...",
      "thumbnailUrl": "/thumbnails/hackernews-12345.png",
      "tags": ["technology", "startup"],
      "originalUrl": "https://news.ycombinator.com/item?id=12345",
      "crawledAt": "2025-12-31T10:00:00.000Z",
      "publishedAt": "2025-12-31T09:00:00.000Z",
      "language": "en"
    }
  ],
  "count": 20
}
```

**Example:**
```bash
curl https://news-data.workers.dev/api/articles?source=hackernews&limit=10
```

### Get Single Article

Get a specific article by ID.

```http
GET /api/articles/:id
```

**Path Parameters:**
- `id`: Article ID (e.g., `hackernews-12345`)

**Response:**
```json
{
  "id": "hackernews-12345",
  "source": "hackernews",
  "originalTitle": "...",
  "transformedTitle": "...",
  "transformedContent": "...",
  "thumbnailUrl": "/thumbnails/hackernews-12345.png",
  "tags": ["technology"],
  "originalUrl": "https://...",
  "crawledAt": "2025-12-31T10:00:00.000Z",
  "language": "en"
}
```

**Example:**
```bash
curl https://news-data.workers.dev/api/articles/hackernews-12345
```

**Error Responses:**
- `404`: Article not found
- `500`: Internal server error

## Subscriptions

### Subscribe to Push Notifications

Subscribe a client to push notifications.

```http
POST /api/subscriptions
Content-Type: application/json
```

**Request Body:**
```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response:**
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X POST https://news-data.workers.dev/api/subscriptions \
  -H 'Content-Type: application/json' \
  -d '{"endpoint":"https://...","keys":{"p256dh":"...","auth":"..."}}'
```

### Get Subscription Count

Get the number of active subscriptions (debug endpoint).

```http
GET /api/subscriptions/count
```

**Response:**
```json
{
  "count": 42
}
```

### Send Test Push Notification

Send a test push notification to all subscribers.

```http
POST /api/subscriptions/test
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Test Notification",
  "message": "This is a test"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 40,
  "failed": 2,
  "errors": [...]
}
```

## Admin

### Manual Crawl

Manually trigger article crawling.

```http
POST /api/admin/crawl
Content-Type: application/json
```

**Request Body:**
```json
{
  "sources": ["hackernews", "t24"],
  "count": 5,
  "sync": true
}
```

**Parameters:**
- `sources` (optional): Array of sources to crawl (default: `["hackernews"]`)
- `count` (optional): Articles per source (default: 5)
- `sync` (optional): Wait for completion (default: true)

**Response (sync: true):**
```json
{
  "success": true,
  "count": 10,
  "status": "completed",
  "articles": [...],
  "results": [
    {
      "providerId": "hackernews",
      "articles": [...],
      "duration": 1234
    }
  ]
}
```

**Response (sync: false):**
```json
{
  "success": true,
  "status": "processing",
  "message": "Crawling 2 sources in background"
}
```

**Example:**
```bash
curl -X POST https://news-data.workers.dev/api/admin/crawl \
  -H 'Content-Type: application/json' \
  -d '{"sources":["hackernews"],"count":5,"sync":true}'
```

### Clean KV Indexes

Clear all article indexes from KV storage.

```http
POST /api/admin/clean
```

**Response:**
```json
{
  "success": true,
  "message": "KV store cleaned successfully",
  "deletedKeys": ["index:all", "index:hackernews", "index:t24", ...]
}
```

**Example:**
```bash
curl -X POST https://news-data.workers.dev/api/admin/clean
```

### List Providers

Get list of all providers and their status.

```http
GET /api/admin/providers
```

**Response:**
```json
{
  "all": ["hackernews", "t24", "eksisozluk", "reddit", "wikipedia"],
  "enabled": ["hackernews", "t24", "eksisozluk", "reddit", "wikipedia"]
}
```

**Example:**
```bash
curl https://news-data.workers.dev/api/admin/providers
```

## Assets

### Get Thumbnail

Get an article thumbnail image.

```http
GET /thumbnails/:filename
```

**Path Parameters:**
- `filename`: Thumbnail filename (e.g., `hackernews-12345.png`)

**Response:**
- Content-Type: `image/png` or `image/jpeg`
- Cache-Control: `public, max-age=31536000`

**Example:**
```bash
curl https://news-data.workers.dev/thumbnails/hackernews-12345.png
```

### Health Check

Check if the service is running.

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-31T10:00:00.000Z"
}
```

### Test Thumbnail Generation

Test thumbnail generation with a mock article.

```http
GET /test-gen
```

**Response:**
- Content-Type: `image/png`
- X-Generated-Size: `12345`

## Legacy Routes

These routes redirect to their new equivalents for backward compatibility:

```
GET  /api/subscribe          → 301 /api/subscriptions
POST /api/subscribe          → 307 /api/subscriptions
GET  /api/article/:id        → 301 /api/articles/:id
POST /api/crawl              → 307 /api/admin/crawl
POST /api/clean              → 307 /api/admin/clean
POST /api/test-push          → 307 /api/subscriptions/test
GET  /api/debug-subs         → 301 /api/subscriptions/count
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "status": 500
}
```

**Common Status Codes:**
- `200`: Success
- `400`: Bad request (validation error)
- `404`: Not found
- `500`: Internal server error

## Rate Limiting

Currently no rate limiting is enforced. Implement your own rate limiting at the edge or application level if needed.

## Authentication

Currently no authentication is required. All endpoints are public. Add authentication middleware if needed for production use.

## CORS

All endpoints support CORS with these headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Scheduled Jobs

The system automatically runs scheduled jobs every 4 hours:

**Cron Expression:** `0 */4 * * *`

**What it does:**
1. Crawls configured sources (HackerNews, T24, Ekşi Sözlük)
2. Transforms content with AI
3. Generates thumbnails
4. Saves to R2 and indexes in KV
5. Sends push notifications to subscribers

## Webhooks

Currently no webhook support. Push notifications are the primary real-time update mechanism.

## SDKs

No official SDKs yet. The API is simple REST/JSON and can be used with any HTTP client:

**JavaScript/TypeScript:**
```typescript
const response = await fetch('https://news-data.workers.dev/api/articles');
const { articles } = await response.json();
```

**Python:**
```python
import requests
response = requests.get('https://news-data.workers.dev/api/articles')
articles = response.json()['articles']
```

**cURL:**
```bash
curl https://news-data.workers.dev/api/articles | jq .
```

## Pagination

Currently implemented via `limit` parameter. Full pagination with `offset` can be added:

```http
GET /api/articles?limit=20&offset=0
GET /api/articles?limit=20&offset=20
```

## Filtering

Currently only source filtering is supported. Additional filters can be added:

```http
GET /api/articles?language=en
GET /api/articles?tag=technology
GET /api/articles?since=2025-12-31T00:00:00Z
```

## Search

Full-text search is not yet implemented. Consider adding:

```http
GET /api/articles/search?q=cloudflare
```

## Versioning

API version is not currently included in the path. Consider adding for future:

```http
GET /api/v1/articles
GET /api/v2/articles
```

---

For more details, see:
- [Architecture Documentation](./ARCHITECTURE.md)
- [Provider Guide](./PROVIDERS.md)
- [Development Guide](./DEVELOPMENT.md)
