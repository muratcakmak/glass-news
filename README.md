# News Data - AI-Powered News Aggregation System

A serverless news aggregation system built on Cloudflare Workers that crawls multiple news sources, transforms content with AI (Orhan Pamuk/New Yorker style), generates thumbnails, and serves a JSON API for mobile clients.

## Features

- **Multi-source News Crawling**: Aggregates from T24, Eksisozluk, HackerNews, Wikipedia, and Reddit
- **Timezone-aware Scheduling**: Crawls Turkish sources during SF night hours (10 PM - 7 AM PST) and English sources during SF business hours (9 AM - 6 PM PST)
- **AI Content Transformation**: Uses OpenRouter API to transform news into literary, engaging narratives (Orhan Pamuk/New Yorker style)
- **AI-Generated Artwork**: Creates unique, contextually-relevant artwork for each article using Stable Diffusion XL Lightning
  - Smart prompt generation based on article themes
  - 8 artistic styles × 6 moods = unique visual identity
  - Automatic fallback to pattern generation
- **R2 Storage**: Stores articles and AI-generated artwork in Cloudflare R2 (S3-compatible)
- **KV Indexing**: Fast article lookups using Cloudflare KV
- **RESTful JSON API**: Easy integration with mobile clients
- **Mostly Free**: ~100 free AI images/day, then ~$46/month (or 100% free with pattern fallback)

## Architecture

```
┌─────────────────┐
│ Cron Triggers   │
│ (Hourly 9-6 PM) │ ──┐
└─────────────────┘   │
                      ▼
┌─────────────────┐   ┌──────────────────┐
│ Crawlers        │──▶│ AI Transformer   │
│ - T24           │   │ (OpenRouter API) │
│ - Eksisozluk    │   └──────────────────┘
│ - HackerNews    │            │
│ - Wikipedia     │            ▼
│ - Reddit        │   ┌──────────────────┐
└─────────────────┘   │ Thumbnail Gen    │
                      └──────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ R2 Storage       │
                      │ + KV Index       │
                      └──────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ JSON API         │
                      │ /api/articles    │
                      └──────────────────┘
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) installed
- Cloudflare account (free tier works!)
- OpenRouter API key (optional, for AI transformation)
- Reddit API credentials (optional, for Reddit crawling)

### Installation

1. Clone and install dependencies:

```bash
bun install
```

2. Login to Cloudflare:

```bash
bunx wrangler login
```

3. Create R2 bucket and KV namespace:

```bash
bunx wrangler r2 bucket create news-articles
bunx wrangler kv:namespace create NEWS_KV
```

4. Update `wrangler.toml` with your KV namespace ID (from the previous command output)

5. Set up secrets:

```bash
# Required for AI transformation
bunx wrangler secret put OPENROUTER_API_KEY

# Optional: Reddit credentials
bunx wrangler secret put REDDIT_CLIENT_ID
bunx wrangler secret put REDDIT_CLIENT_SECRET
```

### Development

Run locally:

```bash
bun run dev
```

Test cron triggers:

```bash
bun run test
```

### Deployment

Deploy to Cloudflare Workers:

```bash
bun run deploy
```

Your worker will be live at: `https://news-data.<your-subdomain>.workers.dev`

## API Endpoints

### Get All Articles

```bash
GET /api/articles?limit=20&source=hackernews
```

**Query Parameters:**
- `limit` (optional): Number of articles to return (default: 20)
- `source` (optional): Filter by source (t24, eksisozluk, hackernews, wikipedia, reddit)

**Response:**
```json
{
  "articles": [
    {
      "id": "hn-12345",
      "source": "hackernews",
      "originalTitle": "...",
      "originalContent": "...",
      "transformedTitle": "...",
      "transformedContent": "...",
      "thumbnailUrl": "/thumbnails/hn-12345.png",
      "originalUrl": "...",
      "crawledAt": "2025-01-01T12:00:00Z",
      "language": "en",
      "tags": ["technology"]
    }
  ],
  "count": 20
}
```

### Get Single Article

```bash
GET /api/article/{article-id}
```

### Get Thumbnail

```bash
GET /thumbnails/{article-id}.png
```

### Manual Crawl (Testing)

```bash
POST /api/crawl
Content-Type: application/json

{
  "sources": ["turkish", "english"]
}
```

### Health Check

```bash
GET /health
```

## AI-Generated Artwork

Each article gets **unique, contextually-relevant artwork** generated using Stable Diffusion XL!

### How It Works

1. **Content Analysis**: System analyzes article title and content
2. **Theme Detection**: Identifies themes (tech, politics, culture, etc.)
3. **Style Selection**: Chooses from 8 artistic styles and 6 moods
4. **AI Generation**: Creates artwork using Cloudflare AI Workers
5. **Storage**: Saves to R2 and serves via CDN

### Example Prompts

- Tech article: "Create a minimalist geometric illustration that represents technology and innovation..."
- Cultural article: "Create a japanese woodblock print style that represents culture and society..."

### Cost

- **Free tier**: 100 images/day (~$0)
- **Beyond free**: $0.011 per image (~$46/month for 240 articles/day)
- **100% free mode**: Disable AI, use pattern generation instead

See [AI_ARTWORK.md](./AI_ARTWORK.md) for full documentation.

## Cron Schedule

The worker automatically crawls sources based on your SF timezone:

- **English sources** (HN, Wikipedia, Reddit): Every hour from 9 AM - 6 PM PST
- **Turkish sources** (T24, Eksisozluk): Every hour from 10 PM - 7 AM PST

This is configured in `wrangler.toml` using UTC times:

```toml
[triggers]
crons = [
  "0 17-23 * * *",  # English: 9 AM - 3 PM PST
  "0 0-2 * * *",    # English: 4 PM - 6 PM PST
  "0 6-15 * * *",   # Turkish: 10 PM - 7 AM PST
]
```

## Cost Breakdown

### Infrastructure (Free)

- **Workers**: 100,000 requests/day (free)
- **R2 Storage**: 10 GB storage (free)
- **KV**: 100,000 reads/day (free)
- **Cron Triggers**: Included in Workers quota

### AI Services

- **Cloudflare AI**: 10,000 neurons/day free (~100 images), then $0.011/image
- **OpenRouter (content transformation)**: Pay per token, ~$0.01-0.05 per article

**Total estimated cost:** ~$50-60/month for 240 articles/day, or **$0/month** if you:
- Disable AI artwork (use pattern generation)
- Limit to 100 articles/day (stay in free tier)

## React Native Integration

Example fetch in your mobile app:

```typescript
const fetchNews = async () => {
  const response = await fetch(
    'https://news-data.your-subdomain.workers.dev/api/articles?limit=50'
  );
  const data = await response.json();
  return data.articles;
};
```

## Project Structure

```
news-data/
├── src/
│   ├── index.ts                 # Main worker entry point
│   ├── types.ts                 # TypeScript types
│   ├── crawlers/
│   │   ├── t24.ts              # T24 news crawler
│   │   ├── eksisozluk.ts       # Eksisozluk crawler
│   │   ├── hackernews.ts       # HackerNews crawler
│   │   ├── wikipedia.ts        # Wikipedia crawler
│   │   └── reddit.ts           # Reddit crawler
│   ├── transformers/
│   │   ├── content.ts          # AI content transformation
│   │   └── thumbnail.ts        # Thumbnail generation
│   └── utils/
│       └── storage.ts          # R2 and KV storage utilities
├── wrangler.toml               # Cloudflare configuration
└── package.json
```

## Customization

### Change AI Style

Edit `src/transformers/content.ts` to modify the AI prompt:

```typescript
const ORHAN_PAMUK_PROMPT = `Your custom prompt here...`;
```

### Add New Sources

1. Create a new crawler in `src/crawlers/your-source.ts`
2. Import and call it in `src/index.ts` scheduled function
3. Add the source to the `NewsArticle` type in `src/types.ts`

### Modify Cron Schedule

Edit `wrangler.toml` to change crawling times:

```toml
[triggers]
crons = ["0 */2 * * *"]  # Every 2 hours
```

## Monitoring

View real-time logs:

```bash
bun run tail
```

Check Cloudflare dashboard:
- Workers → Your worker → Metrics
- R2 → news-articles → Metrics

## Troubleshooting

### Worker not deploying?

Make sure you're logged in:
```bash
bunx wrangler whoami
```

### KV/R2 not working?

Check that the namespace IDs in `wrangler.toml` match your actual resources:
```bash
bunx wrangler kv:namespace list
bunx wrangler r2 bucket list
```

### Cron not triggering?

Cron jobs only work in production, not in local dev. Deploy first:
```bash
bun run deploy
```

## License

MIT

## Contributing

Pull requests welcome! This is a personal project but feel free to fork and customize.
