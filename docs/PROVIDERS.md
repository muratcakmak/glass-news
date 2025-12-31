# News Providers System

## Overview

The news-data project uses a **pluggable provider architecture** that allows you to easily add, remove, or disable news sources without affecting the rest of the system.

## How It Works

### Provider Interface

All news providers implement the `NewsProvider` interface:

```typescript
interface NewsProvider {
  config: ProviderConfig;
  crawl(limit: number, env: Env): Promise<NewsArticle[]>;
  enrichContent?(article: NewsArticle, env: Env): Promise<NewsArticle>;
  canRun(env: Env): boolean;
}
```

### Provider Registry

The `ProviderRegistry` manages all providers and handles:
- Registration/unregistration
- Crawling single or multiple providers
- Filtering enabled providers
- Error handling per provider

## Adding a New Provider

### Step 1: Create Provider Class

Create a new file in `src/providers/`:

```typescript
// src/providers/mynews.provider.ts
import { BaseProvider } from "./base.provider";
import type { NewsArticle, Env } from "../types";

export class MyNewsProvider extends BaseProvider {
  constructor() {
    super({
      id: "mynews",
      name: "My News Source",
      enabled: true,
      language: "en",
      defaultLimit: 10,
      fetchFullContent: false,
    });
  }

  async crawl(limit: number, env: Env): Promise<NewsArticle[]> {
    // Implement crawling logic here
    const articles: NewsArticle[] = [];

    // Fetch from your news source
    const response = await fetch("https://api.mynews.com/articles");
    const data = await response.json();

    // Transform to NewsArticle format
    for (const item of data.items.slice(0, limit)) {
      articles.push({
        id: this.generateId(item.id),
        source: "mynews", // Add to NewsArticle type
        originalTitle: item.title,
        originalContent: item.content,
        originalUrl: item.url,
        crawledAt: new Date().toISOString(),
        language: "en",
      });
    }

    return articles;
  }

  canRun(env: Env): boolean {
    // Return true if provider can run
    // Check for required API keys here
    return true;
  }
}
```

### Step 2: Update Types

Add your source to the `NewsArticle` type:

```typescript
// src/types/article.ts
export interface NewsArticle {
  source: "hackernews" | "t24" | "eksisozluk" | "mynews" | /* ... */;
  // ... rest of interface
}
```

### Step 3: Register Provider

Add to `src/providers/index.ts`:

```typescript
import { MyNewsProvider } from "./mynews.provider";

export function registerAllProviders(): void {
  registry.register(new HackerNewsProvider());
  registry.register(new T24Provider());
  // ... other providers
  registry.register(new MyNewsProvider()); // Add here
}
```

### Step 4: Test

```bash
# Start dev server
bun run dev

# Test your provider
curl -X POST http://localhost:8787/api/admin/crawl \
  -H 'Content-Type: application/json' \
  -d '{"sources": ["mynews"], "count": 5, "sync": true}'
```

## Disabling a Provider

### Option 1: Set enabled: false in config

```typescript
export class MyNewsProvider extends BaseProvider {
  constructor() {
    super({
      id: "mynews",
      enabled: false, // Disable here
      // ... rest of config
    });
  }
}
```

### Option 2: Comment out registration

```typescript
export function registerAllProviders(): void {
  registry.register(new HackerNewsProvider());
  // registry.register(new MyNewsProvider()); // Commented out
}
```

### Option 3: Unregister at runtime

```typescript
import { registry } from "./lib/provider-registry";
registry.unregister("mynews");
```

## Removing a Provider

1. Delete the provider file from `src/providers/`
2. Remove from `src/providers/index.ts`
3. Remove from `NewsArticle` source type (optional)

The system will continue to work with remaining providers!

## Available Providers

| Provider | ID | Language | Enabled | Requirements |
|----------|-----|----------|---------|--------------|
| Hacker News | `hackernews` | en | ✅ | None |
| T24 | `t24` | tr | ✅ | None |
| Ekşi Sözlük | `eksisozluk` | tr | ✅ | SERPER_API_KEY |
| Reddit | `reddit` | en | ✅ | Optional: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET |
| Wikipedia | `wikipedia` | en | ✅ | None |

## API Endpoints

### List All Providers

```bash
GET /api/admin/providers
```

Response:
```json
{
  "all": ["hackernews", "t24", "eksisozluk", "reddit", "wikipedia"],
  "enabled": ["hackernews", "t24", "eksisozluk", "reddit", "wikipedia"]
}
```

### Crawl Specific Providers

```bash
POST /api/admin/crawl
Content-Type: application/json

{
  "sources": ["hackernews", "reddit"],
  "count": 5,
  "sync": true
}
```

### Crawl All Enabled Providers

```bash
POST /api/admin/crawl
Content-Type: application/json

{
  "sources": ["all"],
  "count": 5
}
```

## Provider Lifecycle

1. **Registration** - Provider is registered in `src/providers/index.ts`
2. **Validation** - `canRun()` checks if provider has required configuration
3. **Crawling** - `crawl()` fetches articles from source
4. **Enrichment** (optional) - `enrichContent()` fetches full article content
5. **Processing** - Articles are transformed by AI and saved to R2
6. **Notification** - Push notifications sent to subscribers

## Best Practices

### Error Handling

Providers should handle errors gracefully:

```typescript
async crawl(limit: number, env: Env): Promise<NewsArticle[]> {
  try {
    // Crawl logic
  } catch (error) {
    this.error("Error crawling:", error);
    return []; // Return empty array on error
  }
}
```

### Logging

Use built-in logging methods:

```typescript
this.log("Crawled 10 articles");
this.error("Failed to fetch:", error);
```

### Validation

Check requirements in `canRun()`:

```typescript
canRun(env: Env): boolean {
  if (!env.MY_API_KEY) {
    this.log("Missing MY_API_KEY");
    return false;
  }
  return true;
}
```

### ID Generation

Use `generateId()` for consistent IDs:

```typescript
id: this.generateId(externalId)
// Results in: "mynews-12345"
```

## Testing

### Unit Test a Provider

```typescript
import { MyNewsProvider } from "./mynews.provider";

const provider = new MyNewsProvider();
const mockEnv = { /* ... */ };

const articles = await provider.crawl(5, mockEnv);
console.log(`Got ${articles.length} articles`);
```

### Integration Test

```bash
# Start local dev server
bun run dev

# Test crawl
curl -X POST http://localhost:8787/api/admin/crawl \
  -H 'Content-Type: application/json' \
  -d '{"sources": ["mynews"], "count": 5, "sync": true}' | jq .

# Verify articles saved
curl http://localhost:8787/api/articles?source=mynews | jq .count
```

## Advanced: Content Enrichment

Some providers need a two-step process:

1. **Crawl** - Get headlines/summaries
2. **Enrich** - Fetch full content

Implement `enrichContent()`:

```typescript
async enrichContent(article: NewsArticle, env: Env): Promise<NewsArticle> {
  try {
    // Fetch full article
    const response = await fetch(article.originalUrl);
    const html = await response.text();

    // Extract content
    const content = extractContent(html);
    article.originalContent = content;

    return article;
  } catch (error) {
    this.error("Error enriching:", error);
    return article; // Return original on error
  }
}
```

The registry automatically calls `enrichContent()` if it exists.

## Troubleshooting

### Provider Not Showing Up

1. Check it's registered in `src/providers/index.ts`
2. Check `enabled: true` in config
3. Check `canRun()` returns true
4. Check console logs for errors

### Crawl Returns No Articles

1. Check provider's `crawl()` implementation
2. Check API endpoints are reachable
3. Check for rate limiting
4. Enable verbose logging

### Articles Not Saved

1. Check transformation errors in logs
2. Verify R2 bucket permissions
3. Check KV namespace permissions
4. Test with a simple article first

## Migration from Old System

The old crawler files (`src/crawlers/*.ts`) are now deprecated. The provider system is a drop-in replacement:

**Old:**
```typescript
import { crawlHackerNews } from "./crawlers/hackernews";
const articles = await crawlHackerNews();
```

**New:**
```typescript
import { registry } from "./providers";
const result = await registry.crawlProvider("hackernews", 10, env);
const articles = result.articles;
```

---

For more information, see:
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
