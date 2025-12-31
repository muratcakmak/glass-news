# PLAN_001: LLM-Friendly Architecture Refactor

**Status:** Proposed
**Created:** 2025-12-31
**Estimated Effort:** 8-12 hours (5 phases)
**Impact:** High - Complete restructure for maintainability, LLM-friendliness, and performance

## Executive Summary

Refactor the news-data project from a monolithic 815-line `index.ts` to a modern, layered architecture using Hono router, service/repository patterns, and optimal file organization. This will make the codebase more maintainable, easier for LLMs to understand and modify, and more performant.

## Current State Analysis

### Problems
1. **Monolithic Entry Point**: `src/index.ts` is 815 lines with mixed concerns
2. **Manual Routing**: URL matching is error-prone and slow
3. **Tight Coupling**: Business logic, data access, and routing are intertwined
4. **Poor Testability**: Hard to unit test without mocking entire Workers runtime
5. **LLM Unfriendly**: Large files exceed optimal context window chunks
6. **Hardcoded Values**: VAPID keys and constants scattered throughout
7. **Repeated Patterns**: Similar error handling duplicated across handlers

### Current Structure
```
src/
├── index.ts (815 lines - MONOLITHIC)
├── types.ts (37 lines)
├── crawlers/ (7 files - GOOD)
├── transformers/ (2 files - GOOD)
└── utils/ (3 files - OK)
```

## Target Architecture

### New Structure
```
src/
├── index.ts                          # 50-80 lines: Hono app + exports
├── config/
│   ├── constants.ts                  # VAPID keys, rate limits, defaults
│   └── env.ts                        # Environment validation helpers
├── routes/
│   ├── index.ts                      # Route aggregator
│   ├── articles.routes.ts            # Article API routes
│   ├── subscriptions.routes.ts       # Push notification routes
│   ├── admin.routes.ts               # Admin routes (crawl, clean, test)
│   └── assets.routes.ts              # Thumbnails, health
├── handlers/
│   └── scheduled.handler.ts          # Cron job handler
├── services/
│   ├── article.service.ts            # Article business logic
│   ├── push.service.ts               # Push notification orchestration
│   ├── crawl.service.ts              # Crawling orchestration
│   └── transform.service.ts          # Transformation orchestration
├── repositories/
│   ├── article.repository.ts         # R2/KV article operations
│   ├── subscription.repository.ts    # KV subscription operations
│   └── index.repository.ts           # KV index management
├── crawlers/                         # KEEP AS IS (already good)
│   ├── base.ts                       # NEW: Base crawler interface
│   ├── hackernews.ts
│   ├── t24.ts
│   ├── eksisozluk.ts
│   ├── reddit.ts
│   ├── wikipedia.ts
│   ├── webrazzi.ts
│   └── bbc.ts
├── transformers/                     # KEEP AS IS
│   ├── content.ts
│   └── thumbnail.ts
├── middleware/
│   ├── cors.ts                       # CORS middleware
│   ├── error.ts                      # Global error handler
│   └── logger.ts                     # Request logging
├── types/
│   ├── article.ts                    # Article-related types
│   ├── env.ts                        # Env interface
│   ├── api.ts                        # API request/response types
│   └── index.ts                      # Type exports
├── utils/
│   ├── logger.ts                     # Structured logging utility
│   ├── validators.ts                 # Input validation
│   └── response.ts                   # Response helpers
└── lib/
    └── vapid.ts                      # VAPID configuration helper
```

### Design Principles

1. **Single Responsibility**: Each file has one clear purpose
2. **Dependency Injection**: Services depend on abstractions, not implementations
3. **Layered Architecture**: Routes → Services → Repositories → Infrastructure
4. **Type Safety**: Strict TypeScript, no `any` types
5. **LLM-Optimized**: Files ≤ 200 lines, clear naming, consistent patterns
6. **Performance First**: Hono router, lazy loading, parallel operations
7. **Testability**: Pure functions, mockable dependencies

## Implementation Plan

### Phase 1: Foundation & Routing (3 hours)

**Goal**: Install Hono, create base structure, migrate routing

#### 1.1 Install Dependencies
```bash
bun add hono
bun add -D @types/node
```

#### 1.2 Create Base Files
- `src/config/constants.ts` - Extract all hardcoded values
- `src/config/env.ts` - Environment validation
- `src/types/env.ts` - Move Env interface
- `src/types/article.ts` - Move NewsArticle interface
- `src/middleware/cors.ts` - CORS middleware
- `src/middleware/error.ts` - Error handling middleware

#### 1.3 Setup Hono Router
- `src/index.ts` - New entry point with Hono
- `src/routes/index.ts` - Route aggregator
- `src/routes/articles.routes.ts` - Article routes
- `src/routes/subscriptions.routes.ts` - Subscription routes
- `src/routes/admin.routes.ts` - Admin routes
- `src/routes/assets.routes.ts` - Asset routes

#### 1.4 Migration Strategy
1. Create new `src/index.ts` with Hono
2. Keep old `src/index.ts` as `src/index.old.ts`
3. Migrate one route group at a time
4. Test each route group before moving to next
5. Delete `index.old.ts` when complete

**Deliverables**:
- ✓ Hono installed and configured
- ✓ All routes migrated to Hono
- ✓ CORS and error middleware working
- ✓ All existing API endpoints functional

### Phase 2: Service Layer (2.5 hours)

**Goal**: Extract business logic into services

#### 2.1 Create Service Interfaces
```typescript
// src/services/article.service.ts
export class ArticleService {
  async getArticle(id: string, env: Env): Promise<NewsArticle | null>
  async listArticles(source: string | null, limit: number, env: Env): Promise<NewsArticle[]>
  async processArticle(article: NewsArticle, env: Env): Promise<NewsArticle>
  async processArticles(articles: NewsArticle[], env: Env): Promise<NewsArticle[]>
}

// src/services/crawl.service.ts
export class CrawlService {
  async crawlSource(source: string, count: number, env: Env): Promise<NewsArticle[]>
  async crawlAll(count: number, env: Env): Promise<NewsArticle[]>
}

// src/services/push.service.ts
export class PushService {
  async sendNotification(articles: NewsArticle[], env: Env): Promise<void>
  async sendTestNotification(title: string, message: string, env: Env): Promise<PushResult>
  async subscribe(subscription: PushSubscription, env: Env): Promise<void>
}

// src/services/transform.service.ts
export class TransformService {
  async transformArticle(article: NewsArticle, env: Env): Promise<NewsArticle>
  async batchTransform(articles: NewsArticle[], env: Env): Promise<NewsArticle[]>
}
```

#### 2.2 Implement Services
- Extract logic from handlers into services
- Make services testable (pure functions where possible)
- Handle errors at service level
- Add logging at service boundaries

**Deliverables**:
- ✓ ArticleService implemented
- ✓ CrawlService implemented
- ✓ PushService implemented
- ✓ TransformService implemented
- ✓ All route handlers use services

### Phase 3: Repository Layer (2 hours)

**Goal**: Abstract R2/KV operations

#### 3.1 Create Repository Interfaces
```typescript
// src/repositories/article.repository.ts
export class ArticleRepository {
  async save(article: NewsArticle, env: Env): Promise<NewsArticle>
  async findById(id: string, source: string, env: Env): Promise<NewsArticle | null>
  async findMany(ids: string[], env: Env): Promise<NewsArticle[]>
  async saveThumbnail(id: string, blob: Blob, env: Env): Promise<string>
  async getThumbnail(id: string, env: Env): Promise<Blob | null>
}

// src/repositories/index.repository.ts
export class IndexRepository {
  async addToIndex(articleId: string, source: string, env: Env): Promise<void>
  async getIndex(source: string | null, env: Env): Promise<string[]>
  async updateIndex(articleId: string, source: string, env: Env): Promise<void>
  async clearIndexes(env: Env): Promise<void>
}

// src/repositories/subscription.repository.ts
export class SubscriptionRepository {
  async save(subscription: PushSubscription, env: Env): Promise<void>
  async findAll(env: Env): Promise<PushSubscription[]>
  async delete(id: string, env: Env): Promise<void>
  async count(env: Env): Promise<number>
}
```

#### 3.2 Implement Repositories
- Move R2/KV operations from `utils/storage.ts` to repositories
- Add error handling and logging
- Make operations atomic where possible

#### 3.3 Update Services
- Inject repositories into services
- Remove direct R2/KV access from services

**Deliverables**:
- ✓ ArticleRepository implemented
- ✓ IndexRepository implemented
- ✓ SubscriptionRepository implemented
- ✓ Services use repositories
- ✓ Original `utils/storage.ts` removed

### Phase 4: Scheduled Handler & Utilities (1.5 hours)

**Goal**: Refactor cron job and add utilities

#### 4.1 Scheduled Handler
- `src/handlers/scheduled.handler.ts` - Extract from index.ts
- Use CrawlService, TransformService, ArticleService
- Add structured logging
- Improve error handling (per-source try-catch)

#### 4.2 Utilities
- `src/utils/logger.ts` - Structured logging helper
- `src/utils/validators.ts` - Input validation
- `src/utils/response.ts` - Response formatting
- `src/lib/vapid.ts` - VAPID configuration

#### 4.3 Configuration
- Move all constants to `src/config/constants.ts`
- Add environment validation to `src/config/env.ts`

**Deliverables**:
- ✓ Scheduled handler refactored
- ✓ Logging utility implemented
- ✓ All constants centralized
- ✓ Environment validation added

### Phase 5: Documentation & Cleanup (1 hour)

**Goal**: Add LLM-friendly documentation

#### 5.1 Architecture Documentation
- `docs/ARCHITECTURE.md` - System architecture overview
- `docs/API.md` - API endpoint documentation
- `docs/DEVELOPMENT.md` - Development guide
- `docs/TESTING.md` - Testing guide

#### 5.2 LLM Context Files
- `.ai/codebase-summary.md` - High-level codebase overview
- `.ai/common-tasks.md` - Common development tasks
- `.ai/conventions.md` - Coding conventions

#### 5.3 Code Comments
- Add JSDoc comments to public interfaces
- Document complex business logic
- Add inline comments for non-obvious code

#### 5.4 Cleanup
- Remove old files (`index.old.ts`, etc.)
- Remove unused imports
- Format all files
- Run linter

**Deliverables**:
- ✓ Architecture documentation complete
- ✓ API documentation complete
- ✓ LLM context files created
- ✓ Code cleaned up and formatted

## Testing Strategy

### Unit Tests
- Services: Mock repositories, test business logic
- Repositories: Mock env.NEWS_KV and env.NEWS_BUCKET
- Utilities: Pure function tests
- Validators: Input validation tests

### Integration Tests
- Routes: Test with Miniflare
- Scheduled handler: Test with Miniflare
- End-to-end: Test full article pipeline

### Test Structure
```
tests/
├── unit/
│   ├── services/
│   │   ├── article.service.test.ts
│   │   ├── crawl.service.test.ts
│   │   ├── push.service.test.ts
│   │   └── transform.service.test.ts
│   ├── repositories/
│   │   ├── article.repository.test.ts
│   │   ├── index.repository.test.ts
│   │   └── subscription.repository.test.ts
│   └── utils/
│       ├── logger.test.ts
│       └── validators.test.ts
├── integration/
│   ├── routes/
│   │   ├── articles.test.ts
│   │   ├── subscriptions.test.ts
│   │   └── admin.test.ts
│   └── handlers/
│       └── scheduled.test.ts
└── fixtures/
    ├── articles.ts
    └── subscriptions.ts
```

## Performance Considerations

### Router Performance
- **Hono**: 402,820 ops/sec (chosen)
- **itty-router**: 212,598 ops/sec
- **Manual routing**: Current approach (slowest)

### Optimization Strategies
1. **Lazy Loading**: Import crawlers only when needed
2. **Parallel Operations**: Maintain current parallel processing
3. **Edge Caching**: Add Cache API for thumbnails
4. **KV Indexing**: Keep current indexing strategy
5. **Early Returns**: Use middleware for fast 404s

### Bundle Size Impact
- Hono (tiny): ~14KB minified
- Expected total bundle: +20KB (acceptable for Workers)

## Migration Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation**:
- Keep old code in `.old.ts` files during migration
- Test each phase before proceeding
- Can rollback to previous phase if issues arise

### Risk 2: Bundle Size Increase
**Mitigation**:
- Use Hono's tiny preset
- Tree-shake unused code
- Monitor bundle size after each phase

### Risk 3: Performance Regression
**Mitigation**:
- Benchmark before and after
- Use Hono (fastest router)
- Maintain parallel operations

### Risk 4: Learning Curve
**Mitigation**:
- Clear documentation
- Code examples in docs
- Consistent patterns throughout

## Success Metrics

### Code Quality
- [ ] All files ≤ 200 lines
- [ ] No `any` types
- [ ] 100% TypeScript strict mode
- [ ] All public functions documented

### Performance
- [ ] No regression in response times
- [ ] Bundle size < 1MB
- [ ] Cold start < 100ms

### Maintainability
- [ ] LLMs can understand each file independently
- [ ] New features can be added without touching core
- [ ] Tests cover 80%+ of business logic

### Developer Experience
- [ ] Clear error messages
- [ ] Consistent patterns
- [ ] Easy to add new crawlers
- [ ] Easy to add new routes

## Post-Implementation

### Next Steps After Refactor
1. Add comprehensive tests
2. Set up CI/CD pipeline
3. Add monitoring and alerting
4. Performance profiling
5. Documentation for new contributors

### Future Enhancements
1. Add more crawlers
2. Implement article search
3. Add user preferences
4. Implement article filtering
5. Add analytics

## Rollback Plan

If critical issues arise during migration:

1. **Phase 1-2**: Revert to `index.old.ts`
2. **Phase 3-4**: Keep services, revert repositories
3. **Phase 5**: No rollback needed (documentation only)

## Approval & Sign-off

**Questions for Review**:
1. Approve overall architecture approach?
2. Approve Hono as router?
3. Approve 5-phase migration plan?
4. Any additional requirements?

**Next Steps**:
- [ ] Review and approve plan
- [ ] Schedule implementation time
- [ ] Begin Phase 1

---

**References**:
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)
