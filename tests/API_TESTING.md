# API Testing Guide

## Quick Start with Jupyter Notebook

### 1. Install Dependencies

```bash
pip install requests jupyter pandas
```

### 2. Start Jupyter

```bash
cd tests
jupyter notebook api_testing.ipynb
```

### 3. Run All Cells

The notebook will guide you through:
- Crawling articles (raw only, no AI costs)
- Transforming with different variant styles
- Fetching articles in specific variants
- Performance testing variant caching
- Comparing transformation styles

## Manual Testing with cURL

### Test 1: Crawl HackerNews (Raw)

```bash
curl -X POST https://news-data.omc345.workers.dev/api/admin/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["hackernews"],
    "count": 2
  }'
```

### Test 2: Transform Article

```bash
# Replace {article-id} with actual ID from Test 1
curl -X POST https://news-data.omc345.workers.dev/api/admin/transform \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "{article-id}",
    "variant": "technical"
  }'
```

### Test 3: Get Article Variants

```bash
# Get raw
curl "https://news-data.omc345.workers.dev/api/articles/{article-id}?variant=raw"

# Get default
curl "https://news-data.omc345.workers.dev/api/articles/{article-id}?variant=default"

# Get technical
curl "https://news-data.omc345.workers.dev/api/articles/{article-id}?variant=technical"
```

### Test 4: List Available Variants

```bash
curl "https://news-data.omc345.workers.dev/api/articles/{article-id}/variants"
```

## Python Script Testing

Create a file `test_api.py`:

```python
import requests

BASE_URL = "https://news-data.omc345.workers.dev"

# Test 1: Crawl
response = requests.post(
    f"{BASE_URL}/api/admin/crawl",
    json={"sources": ["hackernews"], "count": 2}
)
print("Crawl:", response.json())

# Get article ID
article_id = response.json()["articles"][0]["id"]
print(f"Article ID: {article_id}")

# Test 2: Transform
response = requests.post(
    f"{BASE_URL}/api/admin/transform",
    json={"articleId": article_id, "variants": ["default", "technical"]}
)
print("Transform:", response.json())

# Test 3: Get variants
for variant in ["raw", "default", "technical"]:
    response = requests.get(
        f"{BASE_URL}/api/articles/{article_id}",
        params={"variant": variant}
    )
    data = response.json()
    title = data.get("title") or data.get("originalTitle")
    print(f"{variant.upper()}: {title}")
```

Run with:
```bash
python test_api.py
```

## Testing with Postman

Import this collection:

```json
{
  "info": {
    "name": "News Data API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://news-data.omc345.workers.dev"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/health"
      }
    },
    {
      "name": "Crawl HackerNews",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/admin/crawl",
        "body": {
          "mode": "raw",
          "raw": "{\"sources\": [\"hackernews\"], \"count\": 2}"
        }
      }
    },
    {
      "name": "Transform Article",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/admin/transform",
        "body": {
          "mode": "raw",
          "raw": "{\"articleId\": \"{{article_id}}\", \"variant\": \"technical\"}"
        }
      }
    }
  ]
}
```

## Testing Scenarios

### Scenario 1: Cost-Conscious API Consumer

**Goal:** Get raw data without AI costs

```bash
# Crawl raw
curl -X POST $BASE_URL/api/admin/crawl \
  -d '{"sources": ["hackernews"], "count": 10}'

# Fetch raw articles
curl "$BASE_URL/api/articles?limit=10"
```

**Result:** No AI transformation costs, pure crawled data

### Scenario 2: Mobile App with Multiple Styles

**Goal:** Offer users different reading styles

```bash
# 1. Crawl raw
curl -X POST $BASE_URL/api/admin/crawl \
  -d '{"sources": ["hackernews"], "count": 5}'

# 2. Transform popular article
curl -X POST $BASE_URL/api/admin/transform \
  -d '{"articleId": "hn-123", "variants": ["default", "casual", "brief"]}'

# 3. App fetches based on user preference
# User A (prefers casual)
curl "$BASE_URL/api/articles/hn-123?variant=casual"

# User B (prefers brief)
curl "$BASE_URL/api/articles/hn-123?variant=brief"
```

### Scenario 3: A/B Testing Transformation Styles

**Goal:** Test which variant gets more engagement

```bash
# Generate both variants
curl -X POST $BASE_URL/api/admin/transform \
  -d '{"source": "hackernews", "limit": 10, "variants": ["default", "technical"]}'

# Serve variant A to 50% of users
curl "$BASE_URL/api/articles/hn-123?variant=default"

# Serve variant B to other 50%
curl "$BASE_URL/api/articles/hn-123?variant=technical"

# Track engagement metrics in your app
```

## Performance Testing

### Test Variant Caching

```bash
# First request (generates variant)
time curl "$BASE_URL/api/articles/hn-123?variant=default"
# Expected: ~2-5 seconds (AI generation)

# Second request (cached)
time curl "$BASE_URL/api/articles/hn-123?variant=default"
# Expected: <100ms (cached)
```

### Load Testing with ab (Apache Bench)

```bash
# Install apache2-utils
sudo apt install apache2-utils

# Test raw article fetching (no AI)
ab -n 100 -c 10 "$BASE_URL/api/articles?limit=20"

# Test cached variant fetching
ab -n 100 -c 10 "$BASE_URL/api/articles/hn-123?variant=default"
```

## Debugging

### View Logs

```bash
# Tail worker logs
wrangler tail
```

### Common Issues

**Issue:** Article not found (404)
```bash
# Solution: Check article ID format
curl "$BASE_URL/api/articles"  # List all articles
```

**Issue:** Transformation slow
```bash
# Solution: Check if cached
curl "$BASE_URL/api/articles/hn-123/variants"  # List cached variants
```

**Issue:** Crawl returns empty articles
```bash
# Solution: Check source availability
curl "$BASE_URL/api/admin/providers"  # List enabled sources
```

## Next Steps

1. Run the Jupyter notebook for interactive testing
2. Set up automated tests in CI/CD
3. Monitor API usage and costs
4. Experiment with variant styles

## Documentation

- [Variant System Guide](../docs/VARIANT_SYSTEM.md) - Complete variant documentation
- [API Reference](../docs/API.md) - Full API specification
- [Architecture](../docs/ARCHITECTURE.md) - System architecture

## Sources

- [Cloudflare Workers AI Jupyter Notebook Tutorial](https://developers.cloudflare.com/workers-ai/guides/tutorials/explore-workers-ai-models-using-a-jupyter-notebook/)
- [Testing Cloudflare Workers](https://developers.cloudflare.com/workers/development-testing/)
