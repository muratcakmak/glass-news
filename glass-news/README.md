# Glass News PWA

A Progressive Web App for Glass news with Apple-style Liquid Glass design, local notifications, and offline support.

## Features

- **Liquid Glass UI**: Apple-inspired frosted glass design with blur effects and subtle animations
- **PWA Support**: Installable on iOS, Android, and desktop
- **Local Notifications**: Send notifications without a backend server
- **Offline Support**: Service worker caching for offline access
- **Responsive Design**: Works beautifully on all screen sizes
- **Dark/Light Mode**: Automatic theme based on system preference

## Quick Start

### Option 1: Local Development Server

Any static file server will work:

```bash
# Python
python -m http.server 8000

# Node.js (install serve globally first)
npx serve

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Option 2: Deploy to a Static Host

Upload all files to any static hosting service:

- **Vercel**: `npx vercel`
- **Netlify**: Drag and drop the folder
- **GitHub Pages**: Push to a repo and enable Pages
- **Cloudflare Pages**: Connect your repo

## File Structure

```
glass-news-pwa/
├── index.html          # Main HTML file
├── styles.css          # All styles (liquid glass, layout, components)
├── app.js              # Main JavaScript (rendering, notifications, PWA)
├── sw.js               # Service worker (caching, offline, push)
├── manifest.json       # PWA manifest
├── offline.html        # Offline fallback page
└── icons/
    └── favicon.svg     # App icon (generate PNGs from this)
```

## Generating App Icons

You'll need PNG icons for the PWA. Use the favicon.svg as a base:

```bash
# Using ImageMagick
convert -background none icons/favicon.svg -resize 192x192 icons/icon-192.png
convert -background none icons/favicon.svg -resize 512x512 icons/icon-512.png

# Or use an online tool like:
# https://realfavicongenerator.net
# https://maskable.app/editor
```

Required icon sizes:
- icon-72.png
- icon-96.png
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png
- icon-384.png
- icon-512.png
- icon-maskable-192.png (with padding for Android)
- icon-maskable-512.png
- apple-touch-icon.png (180x180)
- badge-72.png (for notification badge)

## Local Notifications

The app supports local notifications (no backend required):

```javascript
// Request permission
await requestNotificationPermission();

// Show a notification
showLocalNotification('Breaking News!', {
  body: 'New Glass model released',
  icon: 'icons/icon-192.png'
});

// Schedule a notification
scheduleNotification('Reminder', { body: 'Check the news' }, 60000); // 1 minute
```

### iOS Limitations

- PWA must be **added to Home Screen** for notifications to work
- User must grant permission while the app is in foreground
- No scheduled/background notifications when app is closed

## Connecting Your Backend

Replace the sample data in `app.js` with your API:

```javascript
// Example: Fetch from your API
async function fetchNews(category = 'all') {
  const response = await fetch(`https://your-api.com/news?category=${category}`);
  const data = await response.json();
  return data;
}

// Update renderNews() to use real data
async function renderNews(category = 'all') {
  const news = await fetchNews(category);
  elements.newsGrid.innerHTML = '';
  news.forEach(article => {
    elements.newsGrid.appendChild(createNewsCard(article));
  });
}
```

## Push Notifications (with Backend)

For true push notifications that work in the background, you'll need:

1. A backend server with Web Push support
2. VAPID keys for authentication
3. Update `sw.js` to handle push events

Example backend setup with Node.js:

```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send push notification
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'Breaking News',
  body: 'New Glass development announced',
  url: '/article/123'
}));
```

## Customization

### Colors

Edit CSS variables in `styles.css`:

```css
:root {
  --accent: #0a84ff;        /* Primary accent color */
  --bg-primary: #0a0a0f;    /* Main background */
  --glass-bg: rgba(255, 255, 255, 0.08);  /* Glass transparency */
}
```

### Glass Effect Intensity

Adjust blur and saturation:

```css
backdrop-filter: blur(24px) saturate(180%);  /* More blur */
backdrop-filter: blur(12px) saturate(150%);  /* Lighter effect */
```

## Browser Support

- Chrome 76+
- Safari 9+ (iOS 9+)
- Firefox 103+
- Edge 79+

`backdrop-filter` is supported in all modern browsers. The app gracefully degrades in older browsers.

## License

MIT
