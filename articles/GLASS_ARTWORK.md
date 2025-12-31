# Glass-Generated Artwork Feature

Your news aggregation system now generates **unique, contextually-relevant artwork** for each article using Glass!

## How It Works

### 1. Content Analysis
When an article is crawled and transformed, the system analyzes:
- The article's title
- The transformed content (literary version)
- Key themes and topics

### 2. Smart Prompt Generation

The system extracts themes from the content and categorizes them:

**Detected Themes:**
- 🤖 Technology and innovation
- 💼 Business and economy
- 🔬 Science and discovery
- 🎨 Culture and society
- 🏛️ Politics and governance
- 🌍 Global events
- 🏙️ Urban life and cities
- 📚 Knowledge and learning

### 3. Artistic Style Selection

For each article, the system deterministically selects from 8 artistic styles:

1. **Minimalist geometric illustration** - Clean, modern shapes
2. **Vibrant abstract art** - Colorful, expressive
3. **Modern editorial illustration** - Magazine-quality graphics
4. **Impressionist painting style** - Classic artistic approach
5. **Contemporary graphic design** - Bold and current
6. **Surrealist digital art** - Dreamlike and imaginative
7. **Bauhaus-inspired composition** - Functional beauty
8. **Japanese woodblock print style** - Traditional elegance

**Plus 6 different moods:**
- Contemplative and serene
- Dynamic and energetic
- Mysterious and thought-provoking
- Bold and striking
- Elegant and refined
- Playful and imaginative

### 4. Glass Generation

The system uses **Cloudflare Glass Workers** with **Stable Diffusion XL Lightning**:

```typescript
// Example prompt generated:
"Create a minimalist geometric illustration that represents technology and innovation.
The mood should be dynamic and energetic.
Use rich colors and composition suitable for a news article thumbnail.
No text, no people, no logos.
Abstract and artistic interpretation only."
```

### 5. Fallback Strategy

The system has **three levels** of fallback:

1. **Primary**: Cloudflare Glass (Stable Diffusion XL Lightning)
   - Fast (4 steps)
   - Free tier included
   - High quality

2. **Secondary**: DiceBear pattern generation
   - Geometric patterns
   - Always works
   - Deterministic

3. **Tertiary**: Simple URL-based placeholders
   - Gradient backgrounds
   - Text overlay
   - Instant

## Cost Analysis

### Cloudflare Glass Workers Pricing

**Free Tier (Workers AI):**
- **10,000 neurons/day** for free
- Stable Diffusion XL Lightning uses ~100 neurons per image
- = **~100 free images per day**

With your cron schedule:
- ~24 cron runs per day
- ~10 articles per run (on average)
- = ~240 articles per day

**Cost:**
- First 100 images: **FREE**
- Remaining 140 images: **$0.011 per image** = $1.54/day

**Monthly cost:** ~$46/month for Glass-generated artwork

### Free Alternative

To stay 100% free, you can:
1. Disable Glass in `wrangler.toml` (remove `[ai]` section)
2. System automatically falls back to DiceBear patterns
3. Still get unique, attractive thumbnails

## Enable/Disable Glass Artwork

### To Enable (Default)

Already configured! Just deploy:

```bash
bun run deploy
```

The `[ai]` binding in `wrangler.toml` enables it automatically.

### To Disable (Free Mode)

Remove or comment out the AI binding in `wrangler.toml`:

```toml
# Cloudflare Glass for image generation
# [ai]
# binding = "AI"
```

The system will automatically use DiceBear patterns instead.

## Examples of Generated Prompts

**Tech Article:**
> "Create a vibrant abstract art that represents technology and innovation. The mood should be dynamic and energetic. Use rich colors and composition suitable for a news article thumbnail."

**Political Article:**
> "Create a modern editorial illustration that represents politics and governance. The mood should be contemplative and serene. Use rich colors and composition suitable for a news article thumbnail."

**Cultural Article:**
> "Create a japanese woodblock print style that represents culture and society. The mood should be elegant and refined. Use rich colors and composition suitable for a news article thumbnail."

## Advantages

✅ **Unique artwork** - Every article gets a custom image
✅ **Contextually relevant** - Based on actual article content
✅ **Consistent branding** - Deterministic style selection per article
✅ **Professional quality** - Stable Diffusion XL is state-of-the-art
✅ **Fast generation** - Lightning model generates in ~2 seconds
✅ **Automatic fallback** - Never fails, always produces something

## Technical Details

### Model Used
- **@cf/bytedance/stable-diffusion-xl-lightning**
- 4-step generation (optimized for speed)
- Guidance scale: 7.5
- Output: 1024x1024 PNG images

### Storage
- Generated images stored in R2 bucket
- Path: `/thumbnails/{article-id}.png`
- Cached indefinitely
- Served via CDN

### Performance
- Generation time: ~2-4 seconds per image
- Parallel generation: Up to 5 at a time
- Total batch processing: ~1 minute for 10 articles

## Customization

Want different styles? Edit `src/transformers/thumbnail.ts`:

```typescript
const styles = [
  'your-custom-style-1',
  'your-custom-style-2',
  // Add more styles...
];

const moods = [
  'your-custom-mood-1',
  'your-custom-mood-2',
  // Add more moods...
];
```

Want different themes? Update the `themeMap` in `extractThemes()` function.

## Monitoring

View Glass generation logs:

```bash
bun run tail
```

Look for:
```
Generating Glass artwork for hn-12345: Create a minimalist...
```

## Future Enhancements

Potential improvements you could add:

1. **Use research-powerpack MCP** to generate even better prompts
2. **Multiple images per article** for carousel views
3. **Custom color palettes** based on article tags
4. **User preferences** for artistic style
5. **A/B testing** different styles for engagement

---

**Bottom line:** Your news app will have gorgeous, unique artwork that makes every article visually stunning!
