# Quick Start Guide

## 🚀 Deploy Now

```bash
# Deploy to production
bun run deploy
```

## 📖 Common Tasks

### Add a New News Provider

```typescript
// 1. Create src/providers/mynews.provider.ts
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
    const articles: NewsArticle[] = [];
    // Your crawling logic here
    return articles;
  }

  canRun(env: Env): boolean {
    return true; // Or check for API keys
  }
}

// 2. Add to src/types/article.ts
source: "hackernews" | "t24" | "mynews" | ...

// 3. Register in src/providers/index.ts
import { MyNewsProvider } from "./mynews.provider";

export function registerAllProviders(): void {
  // ... other providers
  registry.register(new MyNewsProvider());
}
```

Done! Deploy and your provider is live.

### Disable a Provider

```typescript
// Option 1: Set enabled: false
super({ id: "mynews", enabled: false, ... })

// Option 2: Comment out registration
// registry.register(new MyNewsProvider());
```

### Test Locally

```bash
# Start dev server
bun run dev

# Test crawl
curl -X POST http://localhost:8787/api/admin/crawl \
  -H 'Content-Type: application/json' \
  -d '{"sources": ["hackernews"], "count": 2, "sync": true}'

# List articles
curl http://localhost:8787/api/articles

# Check providers
curl http://localhost:8787/api/admin/providers
```

### View Logs

```bash
# Real-time logs
bun run tail

# Filter by error
bunx wrangler tail --status error
```

### Run Tests

```bash
bun test
```

### Add a New Route

```typescript
// src/routes/my.routes.ts
import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/hello", (c) => {
  return c.json({ message: "Hello World" });
});

export default app;

// src/index.ts
import myRoutes from "./routes/my.routes";
app.route("/api/my", myRoutes);
```

## 📚 Documentation

- **Architecture**: `docs/ARCHITECTURE.md`
- **API Reference**: `docs/API.md`
- **Provider Guide**: `docs/PROVIDERS.md`
- **Development Guide**: `docs/DEVELOPMENT.md`

## 🔧 Project Structure

```
src/
├── index.ts              # Entry point (42 lines)
├── config/               # Configuration
├── types/                # TypeScript types
├── providers/            # News providers (add/remove easily!)
├── services/             # Business logic
├── repositories/         # Data access (R2/KV)
├── routes/               # HTTP routes
├── middleware/           # Middleware (CORS, logging, errors)
├── handlers/             # Background handlers (cron)
├── transformers/         # AI transformation
└── utils/                # Utilities
```

## 💡 Tips

1. **All files < 200 lines** - Easy for LLMs to understand
2. **Add providers in 3 steps** - See above
3. **No breaking changes** - Old code kept for reference
4. **Type-safe** - Strict TypeScript throughout
5. **Fast router** - Hono (402K ops/sec)

## 🎯 Next Steps

1. Deploy: `bun run deploy`
2. Add your own providers
3. Customize transformers
4. Add more tests
5. Enjoy!

---

**Need help?** See `docs/` folder for detailed guides.
