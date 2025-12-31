# Open Graph Image Instructions

## Required Image: og-image.png

**Dimensions:** 1200 x 630 pixels
**Format:** PNG (or JPG)
**Location:** `/icons/og-image.png`

---

## Design Guidelines

### Visual Elements:
1. **Background**
   - Dark gradient matching the app theme (#0a0a0f to #1a1a24)
   - Glass-morphism frosted effect
   - Subtle noise texture

2. **Text**
   - Large "Glass News" logo/wordmark
   - Tagline: "Curated News · Beautiful UI"
   - Use Instrument Serif or Plus Jakarta Sans font family

3. **Decorative Elements**
   - Floating glass panels with blur
   - Accent color highlights (#0a84ff)
   - Abstract geometric shapes
   - News icons or article cards (optional)

4. **Safe Zone**
   - Keep important text/elements within 1000x540px center
   - Account for circular cropping on some platforms

---

## Quick Creation Options:

### Option 1: Design Tool (Recommended)
- Use Figma, Canva, or Photoshop
- Export at 1200x630px
- Optimize for web (< 1MB)

### Option 2: AI Generation
Prompt:
```
Create a 1200x630px social media preview image for "Glass News"
- Dark glassmorphism design
- Beautiful gradient background (#0a0a0f to #1a1a24)
- Frosted glass panels with blur effects
- Large "Glass News" text in modern sans-serif
- Tagline: "AI-Powered News · Beautiful UI"
- Accent blue (#0a84ff) highlights
- Professional, modern, tech-forward aesthetic
```

### Option 3: Use icon-512.png (Temporary)
Until you create a custom OG image, the current code falls back to:
`/icons/icon-512.png`

---

## After Creating:
1. Save as `og-image.png` in `/icons/` folder
2. Image will automatically be used for:
   - Facebook/LinkedIn previews
   - Twitter cards
   - iMessage/Slack/Discord embeds
   - WhatsApp link previews

---

## Test Your Image:
- **Facebook:** https://developers.facebook.com/tools/debug/
- **Twitter:** https://cards-dev.twitter.com/validator
- **LinkedIn:** Post in preview mode
- **Generic:** https://www.opengraph.xyz/
