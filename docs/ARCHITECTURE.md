# Architecture Documentation

## Overview

news-data is a serverless news aggregation platform built on Cloudflare Workers that crawls, transforms, and serves news from multiple sources through a pluggable provider architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers Edge                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐           │
│  │   Hono     │  │  Middleware  │  │   Scheduled   │           │
│  │   Router   │──│  (CORS/Log)  │  │    Handler    │           │
│  └─────┬──────┘  └──────────────┘  └───────┬───────┘           │
│        │                                     │                   │
│  ┌─────▼──────────────────────────┐  ┌──────▼────────┐         │
│  │         Routes Layer            │  │  Cron Jobs    │         │
│  │  - Articles  - Subscriptions   │  │  (every 4hrs) │         │
│  │  - Admin     - Assets          │  └───────┬───────┘         │
│  └─────────────┬───────────────────┘         │                  │
│                │                              │                  │
│  ┌─────────────▼──────────────────────────────▼───────────┐    │
│  │                  Services Layer                          │    │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐ │    │
│  │  │ Crawl   │  │ Article  │  │  Push   │  │Transform │ │    │
│  │  │ Service │  │ Service  │  │ Service │  │ Service  │ │    │
│  │  └────┬────┘  └────┬─────┘  └────┬────┘  └────┬─────┘ │    │
│  └───────┼────────────┼─────────────┼────────────┼───────┘    │
│          │            │             │            │              │
│  ┌───────▼────────────▼─────────────▼────────────▼───────┐    │
│  │             Repositories Layer                          │    │
│  │  ┌──────────┐  ┌────────┐  ┌──────────────┐           │    │
│  │  │ Article  │  │ Index  │  │Subscription  │           │    │
│  │  │   Repo   │  │  Repo  │  │    Repo      │           │    │
│  │  └────┬─────┘  └───┬────┘  └──────┬───────┘           │    │
│  └───────┼────────────┼───────────────┼───────────────────┘    │
│          │            │               │                         │
│  ┌───────▼────────────▼───────────────▼───────────────────┐    │
│  │             Provider Registry                            │    │
│  │  ┌───────┐ ┌────┐ ┌─────┐ ┌──────┐ ┌─────────┐        │    │
│  │  │  HN   │ │ T24│ │Ekşi │ │Reddit│ │Wikipedia│ ...    │    │
│  │  └───────┘ └────┘ └─────┘ └──────┘ └─────────┘        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   ┌────▼─────┐              ┌─────▼────┐              ┌──────▼──────┐
   │ R2 Bucket│              │  KV Store │              │  External   │
   │ (Articles│              │ (Indexes/ │              │  APIs       │
   │Thumbnails│              │   Subs)   │              │ (News/AI)   │
   └──────────┘              └───────────┘              └─────────────┘
```

## Core Principles

### 1. Layered Architecture

**Routes → Services → Repositories → Infrastructure**

Each layer has clear responsibilities:

- **Routes**: HTTP handling, request validation, response formatting
- **Services**: Business logic, orchestration, transaction management
- **Repositories**: Data access, R2/KV operations
- **Providers**: External news source integration

### 2. Dependency Injection

Services depend on abstractions (repositories), not concrete implementations:

```typescript
// Good
class ArticleService {
  constructor(
    private articleRepo: ArticleRepository,
    private indexRepo: IndexRepository
  ) {}
}

// Bad
class ArticleService {
  async save() {
    await env.NEWS_BUCKET.put(...) // Direct dependency
  }
}
```

### 3. Single Responsibility

Each module has one clear purpose:

- `article.repository.ts` - Article storage operations only
- `crawl.service.ts` - Crawling orchestration only
- `hackernews.provider.ts` - HackerNews integration only

### 4. Pluggable Providers

Providers can be added/removed without system changes:

```typescript
// Add a new provider - just 3 steps!
export class BBCProvider extends BaseProvider { ... }
registry.register(new BBCProvider());
```

## Data Flow

### Article Pipeline

```
1. CRAWL
   Provider.crawl() → NewsArticle[]

2. ENRICH (optional)
   Provider.enrichContent() → NewsArticle (with full content)

3. TRANSFORM
   AI transforms content to target style
   AI generates thumbnail image

4. SAVE
   Repository.save() → R2 (article + thumbnail)
   IndexRepository.add() → KV (indexing)

5. NOTIFY
   PushService.sendNotifications() → Subscribers
```

### Request Flow

```
1. REQUEST
   Client → Cloudflare Edge

2. ROUTING
   Hono Router → Route Handler

3. MIDDLEWARE
   CORS → Logging → Error Handling

4. SERVICE
   Business Logic Execution

5. REPOSITORY
   Data Access (R2/KV)

6. RESPONSE
   JSON → Client
```

## Storage Strategy

### R2 (Object Storage)

**Purpose**: Store articles and thumbnails

**Structure**:
```
articles/
  hackernews/
    hackernews-12345.json
    hackernews-67890.json
  t24/
    t24-12345.json
thumbnails/
  hackernews-12345.png
  t24-12345.jpg
```

**Benefits**:
- Unlimited storage
- Low cost
- Fast CDN delivery
- JSON for flexibility

### KV (Key-Value Store)

**Purpose**: Indexes and subscriptions

**Structure**:
```
index:all          → ["hn-1", "t24-2", "eksi-3", ...]
index:hackernews   → ["hn-1", "hn-2", ...]
index:t24          → ["t24-1", "t24-2", ...]
sub:abc123         → {endpoint, keys}
```

**Benefits**:
- Fast lookups (< 1ms)
- TTL support (auto-expiry)
- Global replication

## Provider System

### Provider Lifecycle

1. **Registration** - Added to registry at startup
2. **Validation** - `canRun()` checks requirements
3. **Crawling** - `crawl()` fetches articles
4. **Enrichment** - `enrichContent()` adds full content (optional)
5. **Error Handling** - Isolated per provider

### Provider Interface

```typescript
interface NewsProvider {
  config: ProviderConfig;
  crawl(limit: number, env: Env): Promise<NewsArticle[]>;
  enrichContent?(article: NewsArticle, env: Env): Promise<NewsArticle>;
  canRun(env: Env): boolean;
}
```

### Provider Registry

Centralized management:
- Parallel crawling with error isolation
- Per-provider error handling
- Dynamic enable/disable
- Language filtering

## Scalability

### Horizontal Scaling

Cloudflare Workers automatically scale:
- Runs in 300+ locations worldwide
- Auto-scales to millions of requests
- No cold starts (V8 isolates)

### Performance Optimizations

1. **Parallel Operations**
   - Crawl multiple providers concurrently
   - Fetch articles in parallel
   - Send push notifications in parallel

2. **Edge Caching**
   - Thumbnails cached at edge (max-age: 1 year)
   - KV automatically replicated globally

3. **Lazy Loading**
   - Providers loaded on-demand
   - Dynamic imports where possible

4. **Batching**
   - Transform articles in batches of 5
   - Reduce API rate limit issues

### Resource Limits

**Worker Limits**:
- CPU Time: 50ms (unbound workers: unlimited)
- Memory: 128MB
- Request Size: 100MB

**R2 Limits**:
- Storage: Unlimited
- Operations: Unlimited

**KV Limits**:
- Reads: 100K/day (free), unlimited (paid)
- Writes: 1K/day (free), unlimited (paid)
- Key Size: 512 bytes
- Value Size: 25MB

## Security

### API Keys

Stored as Cloudflare secrets:
```bash
bunx wrangler secret put OPENROUTER_API_KEY
bunx wrangler secret put GEMINI_API_KEY
bunx wrangler secret put SERPER_API_KEY
```

### CORS

Wide-open for public API:
```typescript
cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
})
```

### Validation

All inputs validated:
- Source names
- Pagination parameters
- Article IDs
- Request bodies

### Rate Limiting

Handled at provider level:
- Batch processing (5 at a time)
- Delays between batches (1s)
- Graceful degradation on errors

## Error Handling

### Layered Error Handling

1. **Provider Level** - Isolated errors, return empty array
2. **Service Level** - Fallback strategies, logging
3. **Route Level** - HTTP error responses
4. **Global Middleware** - Catch-all error handler

### Error Types

```typescript
AppError          // Base application error
NotFoundError     // 404 errors
ValidationError   // 400 errors
ProviderError     // Provider-specific errors
StorageError      // R2/KV errors
```

### Fallback Strategies

1. **Transformation Fails** → Save original article
2. **Thumbnail Fails** → Save article without thumbnail
3. **Provider Fails** → Continue with other providers
4. **Push Fails** → Log error, delete expired subscriptions

## Monitoring & Logging

### Structured Logging

```typescript
const logger = createLogger("ArticleService");
logger.info("Processing article", { id: article.id });
logger.error("Failed to save", { error });
```

### Performance Metrics

```typescript
const { result, duration } = await measureTime("crawl", () =>
  provider.crawl(10, env)
);
// Logs: [Performance] crawl took 1234ms
```

### Cloudflare Analytics

- Request count
- Response time (p50, p95, p99)
- Error rate
- CPU time usage

## Future Improvements

1. **Caching Layer** - Add Cache API for frequently accessed articles
2. **Search** - Add full-text search with Cloudflare Search
3. **Analytics** - Track article views, popular sources
4. **User Preferences** - Personalized feed based on interests
5. **WebSockets** - Real-time article updates
6. **Rate Limiting** - Per-user rate limiting
7. **Admin Dashboard** - Web UI for management

## Technology Stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Router**: Hono (402K ops/sec)
- **Language**: TypeScript (strict mode)
- **Storage**: R2 (objects), KV (indexes)
- **AI**: OpenRouter (Grok), Gemini 2.5 Flash (images)
- **Package Manager**: Bun
- **Testing**: Bun:test

## Development Workflow

```bash
# Local development
bun run dev

# Test scheduled jobs
bun run test

# Deploy to production
bun run deploy

# View logs
bun run tail
```

## File Organization

```
src/
├── index.ts                 # Entry point
├── config/                  # Configuration
├── types/                   # TypeScript types
├── providers/               # News providers
├── services/                # Business logic
├── repositories/            # Data access
├── routes/                  # HTTP routes
├── middleware/              # Middleware
├── handlers/                # Background handlers
├── transformers/            # Content transformation
└── utils/                   # Utilities

tests/
├── unit/                    # Unit tests
├── integration/             # Integration tests
└── fixtures/                # Test data

docs/
├── ARCHITECTURE.md          # This file
├── API.md                   # API documentation
├── PROVIDERS.md             # Provider guide
└── DEVELOPMENT.md           # Dev guide
```

## Key Metrics

- **Files**: 50+ TypeScript files
- **Lines of Code**: ~4,000
- **Providers**: 5 active
- **Routes**: 15+ endpoints
- **Bundle Size**: ~450 KB (gzip: ~90 KB)
- **Average Response**: < 100ms
- **Global Locations**: 300+

---

For more details, see:
- [API Documentation](./API.md)
- [Provider Guide](./PROVIDERS.md)
- [Development Guide](./DEVELOPMENT.md)
