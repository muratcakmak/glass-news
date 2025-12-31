# Development Guide

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (v3.0+)
- Cloudflare account (free tier works)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/news-data.git
   cd news-data
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Create Cloudflare resources**
   ```bash
   # Create R2 bucket
   bunx wrangler r2 bucket create news-articles

   # Create KV namespace
   bunx wrangler kv:namespace create NEWS_KV
   ```

5. **Set secrets**
   ```bash
   bunx wrangler secret put OPENROUTER_API_KEY
   bunx wrangler secret put GEMINI_API_KEY
   bunx wrangler secret put SERPER_API_KEY
   bunx wrangler secret put VAPID_PRIVATE_KEY
   bunx wrangler secret put VAPID_SUBJECT
   # ... other secrets
   ```

## Development Workflow

### Local Development

Start the development server:

```bash
bun run dev
```

The server will start at `http://localhost:8787`.

### Test Scheduled Jobs

Test cron jobs locally:

```bash
bun run test
# or
bunx wrangler dev --test-scheduled
```

### Run Tests

```bash
# Run all tests
bun test

# Run specific test
bun test tests/unit/providers/hackernews.provider.test.ts

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

### Linting & Formatting

```bash
# Type check
bunx tsc --noEmit

# Format code (if you add prettier)
bun format

# Lint (if you add eslint)
bun lint
```

## Project Structure

```
news-data/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/                  # Configuration
│   │   ├── constants.ts
│   │   └── env.ts
│   ├── types/                   # TypeScript types
│   │   ├── article.ts
│   │   ├── env.ts
│   │   ├── provider.ts
│   │   └── index.ts
│   ├── providers/               # News providers
│   │   ├── base.provider.ts
│   │   ├── hackernews.provider.ts
│   │   ├── t24.provider.ts
│   │   ├── eksisozluk.provider.ts
│   │   ├── reddit.provider.ts
│   │   ├── wikipedia.provider.ts
│   │   └── index.ts
│   ├── services/                # Business logic
│   │   ├── crawl.service.ts
│   │   ├── article.service.ts
│   │   ├── push.service.ts
│   │   └── index.ts
│   ├── repositories/            # Data access
│   │   ├── article.repository.ts
│   │   ├── index.repository.ts
│   │   ├── subscription.repository.ts
│   │   └── index.ts
│   ├── routes/                  # HTTP routes
│   │   ├── articles.routes.ts
│   │   ├── subscriptions.routes.ts
│   │   ├── admin.routes.ts
│   │   └── assets.routes.ts
│   ├── middleware/              # Middleware
│   │   ├── cors.ts
│   │   ├── error.ts
│   │   ├── logger.ts
│   │   └── index.ts
│   ├── handlers/                # Background handlers
│   │   └── scheduled.handler.ts
│   ├── lib/                     # Libraries
│   │   └── provider-registry.ts
│   ├── transformers/            # Content transformation
│   │   ├── content.ts
│   │   └── thumbnail.ts
│   └── utils/                   # Utilities
│       ├── logger.ts
│       ├── validators.ts
│       ├── response.ts
│       ├── errors.ts
│       ├── scraper.ts
│       └── storage.ts (legacy)
├── tests/                       # Tests
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── PROVIDERS.md
│   └── DEVELOPMENT.md (this file)
├── articles/                    # Project docs
│   └── PLAN_001_*.md
├── glass-news/                  # Frontend PWA
├── .env.example                 # Environment template
├── .gitignore
├── bunfig.toml
├── package.json
├── tsconfig.json
└── wrangler.toml                # Cloudflare config
```

## Adding Features

### Add a New Provider

See [PROVIDERS.md](./PROVIDERS.md) for detailed guide.

Quick steps:
1. Create `src/providers/mynews.provider.ts`
2. Add to `NewsArticle` source type
3. Register in `src/providers/index.ts`

### Add a New Route

1. Create route file:
   ```typescript
   // src/routes/my.routes.ts
   import { Hono } from "hono";
   import type { Env } from "../types";

   const app = new Hono<{ Bindings: Env }>();

   app.get("/", async (c) => {
     return c.json({ message: "Hello" });
   });

   export default app;
   ```

2. Mount in `src/index.ts`:
   ```typescript
   import myRoutes from "./routes/my.routes";
   app.route("/api/my", myRoutes);
   ```

### Add a New Service

1. Create service file:
   ```typescript
   // src/services/my.service.ts
   import type { Env } from "../types";

   export class MyService {
     async doSomething(env: Env): Promise<void> {
       // Business logic here
     }
   }

   export const myService = new MyService();
   ```

2. Use in routes:
   ```typescript
   import { myService } from "../services";
   app.get("/", async (c) => {
     await myService.doSomething(c.env);
     return c.json({ success: true });
   });
   ```

### Add a New Middleware

1. Create middleware file:
   ```typescript
   // src/middleware/my.middleware.ts
   import { Context, Next } from "hono";

   export async function myMiddleware(c: Context, next: Next) {
     // Do something before request
     await next();
     // Do something after request
   }
   ```

2. Apply globally or to specific routes:
   ```typescript
   // Global
   app.use("*", myMiddleware);

   // Specific route
   app.get("/api/special", myMiddleware, handler);
   ```

## Database Migrations

Since we use R2 and KV (schemaless), there are no traditional migrations.

**Changing article structure:**
1. Update `NewsArticle` type
2. Deploy new code
3. New articles use new structure
4. Old articles remain unchanged (graceful degradation)

**Changing indexes:**
1. Update index structure
2. Run clean command: `POST /api/admin/clean`
3. Crawl new articles to rebuild indexes

## Deployment

### Deploy to Production

```bash
bun run deploy
```

This runs `wrangler deploy` which:
1. Bundles your code
2. Uploads to Cloudflare
3. Updates the worker
4. Deploys to all edge locations

### Deploy Specific Environment

```bash
# Production
bunx wrangler deploy

# Staging
bunx wrangler deploy --env staging

# Development
bunx wrangler deploy --env dev
```

### View Logs

```bash
# Tail logs in real-time
bun run tail

# Filter by status
bunx wrangler tail --status error
bunx wrangler tail --status ok

# Filter by method
bunx wrangler tail --method POST
```

### Rollback

```bash
# List deployments
bunx wrangler deployments list

# Rollback to previous
bunx wrangler rollback [deployment-id]
```

## Environment Variables

### Local Development (.env)

```bash
OPENROUTER_API_KEY=sk-or-v1-...
GEMINI_API_KEY=...
SERPER_API_KEY=...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
VAPID_SUBJECT=mailto:your-email@example.com
VAPID_PRIVATE_KEY=...
```

### Production (Cloudflare Secrets)

```bash
bunx wrangler secret put OPENROUTER_API_KEY
bunx wrangler secret put GEMINI_API_KEY
bunx wrangler secret put SERPER_API_KEY
bunx wrangler secret put VAPID_PRIVATE_KEY
bunx wrangler secret put VAPID_SUBJECT
```

### Public Variables (wrangler.toml)

```toml
[vars]
RESEARCH_MODEL = "x-ai/grok-4.1-fast"
PROMPT_STYLE = "random"
```

## Debugging

### Local Debugging

Use `console.log()` - output shows in terminal:

```typescript
console.log("[Debug] Article ID:", article.id);
console.log("[Debug] Full article:", article);
```

### Production Debugging

1. **Tail logs:**
   ```bash
   bunx wrangler tail
   ```

2. **Check analytics:**
   - Go to Cloudflare Dashboard
   - Workers & Pages → Your Worker → Analytics

3. **Error tracking:**
   - Logs show in `wrangler tail`
   - Set up external error tracking (Sentry, etc.)

### Common Issues

**Provider not crawling:**
- Check `canRun()` returns true
- Verify API keys are set
- Check external API is accessible

**Thumbnail generation failing:**
- Verify GEMINI_API_KEY is set
- Check API quota
- Look for rate limiting errors

**Articles not showing up:**
- Check index was updated (KV)
- Verify article saved to R2
- Check source parameter matches

## Performance Tips

### Optimize Bundle Size

```bash
# Check bundle size
bunx wrangler deploy --dry-run

# Use dynamic imports for large dependencies
const { largeDep } = await import('./large-dep');
```

### Reduce CPU Time

- Use parallel operations (`Promise.all()`)
- Cache expensive computations
- Lazy load providers

### Optimize R2/KV Access

- Batch KV operations
- Use parallel R2 fetches
- Set appropriate TTLs

## Code Style

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Explicit return types on public functions
- Use interfaces for shapes, types for unions

### Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)

### File Organization

- One class/interface per file
- Group related functionality
- Keep files under 200 lines
- Export at bottom of file

### Comments

- JSDoc for public APIs
- Inline comments for complex logic
- No obvious comments

## Testing Best Practices

### Unit Tests

- Test one thing at a time
- Use descriptive test names
- Mock external dependencies
- Aim for 80%+ coverage

### Integration Tests

- Test full workflows
- Use test fixtures
- Clean up after tests
- Test error cases

### E2E Tests

- Test critical user journeys
- Use real data when possible
- Test on staging first

## Git Workflow

### Branch Naming

- Feature: `feature/add-provider-bbc`
- Fix: `fix/thumbnail-generation`
- Docs: `docs/update-api-guide`
- Refactor: `refactor/service-layer`

### Commit Messages

```
feat: Add BBC news provider
fix: Handle thumbnail generation errors gracefully
docs: Update provider guide
refactor: Extract service layer
```

### Pull Requests

1. Create branch from `main`
2. Make changes
3. Write tests
4. Update docs
5. Create PR
6. Get review
7. Merge

## Monitoring

### Metrics to Track

- Request count
- Response time (p50, p95, p99)
- Error rate
- CPU time
- Bundle size

### Alerts

Set up alerts for:
- Error rate > 5%
- Response time > 1s
- CPU time > 30ms
- Failed cron jobs

## Troubleshooting

### Worker Not Deploying

```bash
# Check syntax
bunx tsc --noEmit

# Check bundle
bunx wrangler deploy --dry-run

# Check secrets
bunx wrangler secret list
```

### Cron Jobs Not Running

```bash
# Check cron syntax in wrangler.toml
crons = ["0 */4 * * *"]

# Test locally
bunx wrangler dev --test-scheduled
```

### High CPU Usage

- Profile slow operations
- Optimize loops
- Use streaming where possible
- Batch operations

---

For more information:
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Provider Guide](./PROVIDERS.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
