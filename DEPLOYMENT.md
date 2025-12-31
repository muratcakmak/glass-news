# Deployment Guide

## Quick Start Deployment

Follow these steps to get your news aggregation system up and running on Cloudflare.

### Step 1: Authenticate with Cloudflare

```bash
bunx wrangler login
```

This will open a browser window. Log in and authorize Wrangler.

### Step 2: Create R2 Bucket

```bash
bunx wrangler r2 bucket create news-articles
```

Output:
```
✅ Created bucket news-articles
```

### Step 3: Create KV Namespace

```bash
bunx wrangler kv:namespace create NEWS_KV
```

Output:
```
🌀 Creating namespace with title "news-data-NEWS_KV"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "NEWS_KV", id = "abc123xyz456" }
```

**IMPORTANT**: Copy the `id` value and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "NEWS_KV"
id = "YOUR_ID_HERE"  # Replace with the actual ID from the command output
```

### Step 4: Set Up Secrets

Set your API keys as secrets (they won't be visible in the code):

```bash
# Required for AI transformation
bunx wrangler secret put OPENROUTER_API_KEY
# Paste your key when prompted

# Optional: Reddit API credentials
bunx wrangler secret put REDDIT_CLIENT_ID
# Paste your Reddit client ID

bunx wrangler secret put REDDIT_CLIENT_SECRET
# Paste your Reddit client secret
```

To get these keys:

- **OpenRouter API Key**: Sign up at https://openrouter.ai/ and create a key
- **Reddit Credentials**: Go to https://www.reddit.com/prefs/apps → Create App → Select "script"

### Step 5: Deploy Backend (Worker)

```bash
bun run deploy
```

Output:
```
⛅️ wrangler 4.54.0
------------------
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded news-data (X.XX sec)
Published news-data (X.XX sec)
  https://news-data.your-subdomain.workers.dev
```

### Step 6: Deploy Frontend (Pages)

```bash
bun run deploy:pages
```

This will deploy the `glass-news` folder to Cloudflare Pages.
First time run will ask to create the project.

Output:
```
✨ Success! Uploaded 10 files
✨ Deployment complete! Take a peek over at https://glass-news.pages.dev
```

### Step 7: Test Your Deployment

Health check (Backend):
```bash
curl https://news-data.your-subdomain.workers.dev/health
```

Manual crawl (to test without waiting for cron):
```bash
curl -X POST https://news-data.your-subdomain.workers.dev/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"sources": ["english"]}'
```

Visit the App (Frontend):
Go to https://glass-news.pages.dev (or your custom domain)

### Step 7: Monitor

View live logs:
```bash
bun run tail
```

Check the Cloudflare dashboard:
1. Go to https://dash.cloudflare.com/
2. Select Workers & Pages
3. Click on "news-data"
4. View metrics, logs, and settings

## Local Development

To test locally before deploying:

```bash
# Start local dev server
bun run dev
```

Visit http://localhost:8787 to test the API locally.

**Note**: Cron triggers only work in production, not in local development.

## Updating Your Deployment

After making changes to the code:

```bash
bun run deploy
```

Wrangler will automatically upload the new version.

## Custom Domain (Optional)

To use your own domain:

1. Add your domain to Cloudflare
2. In the Cloudflare dashboard, go to Workers & Pages → news-data → Settings → Triggers
3. Add a custom domain (e.g., `api.yournewsapp.com`)
4. Cloudflare will automatically provision an SSL certificate

## Cost Monitoring

Your Cloudflare dashboard shows usage metrics. With the free tier:

- **100,000 Worker requests/day** - You'll use ~240 (24 cron runs × ~10 requests each)
- **10 GB R2 storage** - Each article is ~5KB, so you can store ~2 million articles
- **100,000 KV reads/day** - Each API request = 1 read, so you can serve 100k article requests/day

Bottom line: **It's free for a very long time!**

## Troubleshooting

### "Error: No account selected"

Run `bunx wrangler login` again to authenticate.

### "Namespace not found"

Make sure you updated `wrangler.toml` with the correct KV namespace ID from Step 3.

### "Cron not running"

Cron triggers only work in production. Deploy first with `bun run deploy`.

### "OpenRouter API errors"

Check that you set the secret correctly:
```bash
bunx wrangler secret list
```

If needed, update it:
```bash
bunx wrangler secret put OPENROUTER_API_KEY
```

## Advanced: Rollback

If a deployment breaks something:

```bash
# View deployments
bunx wrangler deployments list

# Rollback to a previous version
bunx wrangler rollback [deployment-id]
```

## Need Help?

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/
- This project's issues: Create an issue in your repo
