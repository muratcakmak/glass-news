# Quick Start Guide

## What You Have

A complete serverless news aggregation system with:

✅ **5 News Crawlers**:
- T24 (Turkish news)
- Eksisozluk (Turkish forum)
- HackerNews (Tech news)
- Wikipedia (Current events)
- Reddit (r/news, r/worldnews, r/technology)

✅ **AI Content Transformation**:
- Transforms news into Orhan Pamuk/New Yorker literary style
- Uses OpenRouter API with GPT-4o-mini

✅ **AI-Generated Artwork**:
- Unique artwork for each article using Stable Diffusion XL
- Smart prompts based on article themes
- 8 artistic styles × 6 moods = consistent visual identity
- Automatic fallback to patterns if needed

✅ **Smart Scheduling**:
- Turkish sources: 10 PM - 7 AM PST (while you sleep!)
- English sources: 9 AM - 6 PM PST (during work hours)

✅ **Free Infrastructure**:
- Cloudflare Workers (100k requests/day free)
- R2 Storage (10 GB free)
- KV Database (100k reads/day free)
- Cron jobs (included)

✅ **RESTful JSON API** ready for your React Native app

## Next Steps (5 minutes)

### 1. Log in to Cloudflare

```bash
bunx wrangler login
```

This will open a browser - log in with your Cloudflare account (create one if needed - it's free!)

### 2. Create Storage Resources

```bash
# Create R2 bucket for articles and thumbnails
bunx wrangler r2 bucket create news-articles

# Create KV namespace for indexing
bunx wrangler kv:namespace create NEWS_KV
```

**IMPORTANT**: Copy the KV namespace ID from the output and update `wrangler.toml` line 15:

```toml
[[kv_namespaces]]
binding = "NEWS_KV"
id = "YOUR_ACTUAL_ID_HERE"  # Replace this!
```

### 3. Add Your API Key

You have an OpenRouter API key, so let's set it:

```bash
bunx wrangler secret put OPENROUTER_API_KEY
# Paste your key when prompted
```

Optional (for Reddit):
```bash
bunx wrangler secret put REDDIT_CLIENT_ID
bunx wrangler secret put REDDIT_CLIENT_SECRET
```

### 4. Deploy!

```bash
bun run deploy
```

🎉 **Done!** Your worker will be live at: `https://news-data.YOUR-SUBDOMAIN.workers.dev`

### 5. Test It

```bash
# Health check
curl https://news-data.YOUR-SUBDOMAIN.workers.dev/health

# Trigger a manual crawl (don't wait for cron)
curl -X POST https://news-data.YOUR-SUBDOMAIN.workers.dev/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"sources": ["english"]}'

# Wait 30 seconds, then fetch articles
curl https://news-data.YOUR-SUBDOMAIN.workers.dev/api/articles
```

## Using in Your React Native App

```typescript
// In your React Native app
const API_URL = 'https://news-data.YOUR-SUBDOMAIN.workers.dev';

async function fetchNews() {
  const response = await fetch(`${API_URL}/api/articles?limit=50`);
  const data = await response.json();
  return data.articles;
}

// Each article has:
// - transformedTitle: AI-rewritten title
// - transformedContent: Beautiful literary content
// - thumbnailUrl: AI-generated artwork URL
// - originalUrl: Source link
// - tags: Categorization tags
// - language: 'en' or 'tr'
```

## How It Works

1. **Cron triggers** run every hour based on timezone
2. **Crawlers** fetch news from 5 sources
3. **AI transformer** rewrites content in Orhan Pamuk style
4. **AI artwork generator** creates unique contextual images
5. **R2 storage** saves everything
6. **Your app** fetches via JSON API

## Costs

### Infrastructure (Free Forever)
- **$0/month** for up to 100k API requests/day
- **$0/month** for 10 GB storage (~2 million articles)
- **$0/month** for hourly cron jobs

### AI Services (Pay As You Go)
- **OpenRouter**: ~$0.01-0.05 per article (content transformation)
- **Cloudflare AI**: First 100 images/day free, then $0.011/image

**Estimated total:** ~$50-60/month for 240 articles/day

**100% free option:** Disable AI artwork in `wrangler.toml` to use pattern generation instead!

## Monitoring

```bash
# Watch live logs
bun run tail

# Check Cloudflare dashboard
# https://dash.cloudflare.com → Workers & Pages → news-data
```

## Customization

Want to change something?

- **Add sources**: Create file in `src/crawlers/`
- **Change AI style**: Edit `src/transformers/content.ts`
- **Adjust timing**: Modify cron in `wrangler.toml`
- **Custom domain**: Add in Cloudflare dashboard

## Troubleshooting

**"Not logged in"**: Run `bunx wrangler login`

**"Namespace not found"**: Update KV ID in `wrangler.toml`

**"Cron not working"**: Crons only work in production, not local dev

**Need help?**: Check `DEPLOYMENT.md` for detailed troubleshooting

## What's Next?

1. Deploy the worker (5 min)
2. Build your React Native app
3. Style it beautifully
4. Launch on App Store / Play Store
5. ???
6. Profit! (maybe)

---

**Pro tip**: The system crawls Turkish news at night (SF time) so you wake up to fresh content!
