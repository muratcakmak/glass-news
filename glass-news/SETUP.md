# Glass News - Setup Guide

Beautiful PWA UI for your Glass-powered news aggregation system.

## 🎨 What's Connected

✅ **Live API**: `https://news-data.omc345.workers.dev`
✅ **Categories**:
- **All** - All articles from all sources
- **Tech** - HackerNews articles
- **News** - Wikipedia current events
- **Community** - Reddit posts
- **Turkey** - T24 & Eksisozluk (Turkish → English)

## 🚀 Running Locally

```bash
cd glass-news

# Option 1: Python (already running on port 3000)
python3 -m http.server 3000

# Option 2: Bun
bunx serve .

# Option 3: Node.js
npx serve .
```

Then open: **http://localhost:3000**

## 📱 Testing Features

### Desktop Browser
1. Open http://localhost:3000
2. Click categories to filter by source
3. Click articles to open original URLs
4. Enable notifications (optional)

### Mobile Testing
1. Open http://localhost:3000 on your phone
2. Click "Add to Home Screen" to install as PWA
3. Open from home screen for app-like experience
4. Enable notifications for breaking news

## 🎯 Features

✨ **Glassmorphism Design** - Beautiful frosted glass effects
📰 **Live News Feed** - Real-time from your API
🎨 **Glass-Transformed Content** - Orhan Pamuk literary style
🌍 **Turkish → English** - Automatic translation
📱 **PWA** - Install as native app
🔔 **Notifications** - Breaking news alerts (optional)
🌙 **Offline Support** - Via service worker

## 🔧 Customization

### Change API URL
Edit `app.js` line 10:
```javascript
const API_URL = 'https://your-custom-url.workers.dev';
```

### Modify Categories
Edit `index.html` lines 73-77 and `app.js` lines 205-211

### Update Branding
- **Title**: Edit `index.html` line 27 and 44
- **Colors**: Edit `styles.css` CSS variables
- **Icons**: Replace files in `icons/` directory

## 📊 How It Works

1. **Fetch Articles** → API returns transformed content
2. **Transform for UI** → Maps API response to card format
3. **Render Cards** → Beautiful glassmorphism cards
4. **Click → Open** → Original article in new tab

## 🎨 Data Flow

```
API Article Format:
{
  id: "wiki-news-123",
  source: "wikipedia",
  originalTitle: "Turkish title",
  transformedTitle: "Literary English title",
  transformedContent: "Orhan Pamuk style prose...",
  thumbnailUrl: "/thumbnails/123.png",
  tags: ["tag1", "tag2"]
}

↓ Transform ↓

UI Card Format:
{
  id: "wiki-news-123",
  category: "News",
  title: "Literary English title",
  excerpt: "First 200 chars...",
  image: "/thumbnails/123.png",
  author: "Curated",
  date: "2h ago",
  readTime: "5 min"
}
```

## 🌐 Deploy to Production

### Option 1: Cloudflare Pages
```bash
cd glass-news
git init
git add .
git commit -m "Initial commit"

# Push to GitHub, then:
# 1. Go to Cloudflare Pages
# 2. Connect GitHub repo
# 3. Deploy!
```

### Option 2: Vercel
```bash
cd glass-news
vercel
```

### Option 3: Netlify
```bash
cd glass-news
netlify deploy --prod
```

## 🎉 You're All Set!

Your beautiful news UI is connected to your Glass-powered backend. All articles are:
- ✅ Fetched from 5 sources
- ✅ Transformed with Glass Intelligence
- ✅ Translated to English (Turkish sources)
- ✅ Styled like Orhan Pamuk + New Yorker
- ✅ Ready for your users!

Enjoy! 🚀
