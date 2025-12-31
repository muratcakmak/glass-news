# Tests

## Structure

```
tests/
├── unit/                   # Unit tests
│   ├── providers/          # Provider tests
│   ├── services/           # Service tests
│   ├── repositories/       # Repository tests
│   └── utils/              # Utility tests
├── integration/            # Integration tests
│   ├── routes/             # Route tests
│   └── handlers/           # Handler tests
└── fixtures/               # Test data
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/providers/hackernews.provider.test.ts

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## Writing Tests

### Unit Tests

Test individual components in isolation:

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { MyService } from "../../src/services/my.service";

describe("MyService", () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it("should do something", () => {
    const result = service.doSomething();
    expect(result).toBe(true);
  });
});
```

### Integration Tests

Test components working together:

```typescript
import { describe, it, expect } from "bun:test";
import app from "../../src/index";

describe("Articles API", () => {
  it("should list articles", async () => {
    const req = new Request("http://localhost/api/articles");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.articles).toBeDefined();
  });
});
```

### Mocking

```typescript
import { mock } from "bun:test";

const mockEnv = {
  NEWS_BUCKET: mock(() => ({
    get: mock(() => Promise.resolve(null)),
    put: mock(() => Promise.resolve()),
  })),
  NEWS_KV: mock(() => ({
    get: mock(() => Promise.resolve(null)),
    put: mock(() => Promise.resolve()),
  })),
};
```

## Test Coverage Goals

- **Services**: 80%+ coverage
- **Repositories**: 80%+ coverage
- **Utils**: 90%+ coverage
- **Providers**: 70%+ coverage (external APIs are harder to test)

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Use fixtures** - Reuse test data from `fixtures/`
3. **Mock external services** - Don't make real API calls
4. **Test edge cases** - Not just the happy path
5. **Keep tests fast** - Unit tests should run in milliseconds

## Current Status

✅ Unit test examples created
✅ Fixtures created
⏳ Integration tests (TODO)
⏳ E2E tests (TODO)
