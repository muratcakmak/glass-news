# 🚀 Deploy Now - Quick Commands

Copy and paste these commands to deploy in 5 minutes!

## Step 1: Login to Cloudflare
```bash
bunx wrangler login
```

## Step 2: Create Resources
```bash
# Create R2 bucket for articles and images
bunx wrangler r2 bucket create news-articles

# Create KV namespace for indexing
bunx wrangler kv:namespace create NEWS_KV
```

**⚠️ IMPORTANT**: Copy the KV namespace ID from the output above!

## Step 3: Update wrangler.toml

Edit `wrangler.toml` line 15 and replace `"placeholder"` with your actual KV ID:

```toml
[[kv_namespaces]]
binding = "NEWS_KV"
id = "YOUR_KV_ID_HERE"  # ← Put your ID here!
```

## Step 4: Set Secrets

```bash
bunx wrangler secret put OPENROUTER_API_KEY
# Paste: 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

bunx wrangler secret put REDDIT_CLIENT_ID
# Paste: yuq_M0kWusHp2olglFBnpw

bunx wrangler secret put REDDIT_CLIENT_SECRET
# Paste: mgEDGQckoGQd7c3NQ3MutBJ2S54u0g

bunx wrangler secret put SCRAPEDO_API_KEY
# Paste: d4874c0918ad49b782ce649c642364a5561da9e8387

bunx wrangler secret put SERPER_API_KEY
# Paste: a3c7a6122cb26d80c6a975e41b2a1047eb746b59
```

## Step 5: Deploy!
```bash
bun run deploy
```

## Step 6: Test It!
```bash
# Replace YOUR-SUBDOMAIN with the actual subdomain from deploy output

# Health check
curl https://news-data.YOUR-SUBDOMAIN.workers.dev/health

# Trigger initial crawl
curl -X POST https://news-data.YOUR-SUBDOMAIN.workers.dev/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"sources": ["all"]}'

# Wait 30 seconds, then check articles
curl https://news-data.YOUR-SUBDOMAIN.workers.dev/api/articles | jq
```

## 🎉 Done!

Your API is live at: `https://news-data.YOUR-SUBDOMAIN.workers.dev`

### API Endpoints for React Native:
- `GET /api/articles` - Get all articles
- `GET /api/articles?source=hackernews&limit=20` - Filtered
- `GET /api/article/{id}` - Single article
- `GET /thumbnails/{id}.png` - Thumbnail image

See **SETUP_COMPLETE.md** for full documentation!
