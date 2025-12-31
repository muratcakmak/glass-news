import { NewsArticle, Env } from '../types';

/**
 * Generate an artistic prompt based on article content
 * This creates prompts suitable for image generation AI
 */
export function generateArtisticPrompt(article: NewsArticle): string {
  const title = article.transformedTitle || article.originalTitle;
  const content = (article.transformedContent || article.originalContent).slice(0, 500);

  // Extract key themes and concepts
  const themes = extractThemes(title, content);

  // Create an artistic prompt that captures the essence
  const styles = [
    'minimalist geometric illustration',
    'vibrant abstract art',
    'modern editorial illustration',
    'impressionist painting style',
    'contemporary graphic design',
    'surrealist digital art',
    'bauhaus-inspired composition',
    'japanese woodblock print style'
  ];

  const moods = [
    'contemplative and serene',
    'dynamic and energetic',
    'mysterious and thought-provoking',
    'bold and striking',
    'elegant and refined',
    'playful and imaginative'
  ];

  // Use article ID to deterministically select style
  const styleIndex = Math.abs(hashCode(article.id)) % styles.length;
  const moodIndex = Math.abs(hashCode(article.id + 'mood')) % moods.length;

  const prompt = `Create a ${styles[styleIndex]} that represents ${themes}.
    The mood should be ${moods[moodIndex]}.
    Use rich colors and composition suitable for a news article thumbnail.
    No text, no people, no logos.
    Abstract and artistic interpretation only.`.replace(/\s+/g, ' ').trim();

  return prompt;
}

/**
 * Extract key themes from article for prompt generation
 */
function extractThemes(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  // Simple keyword extraction based on common themes
  const themeMap: Record<string, string[]> = {
    'technology and innovation': ['ai', 'tech', 'software', 'computer', 'digital', 'innovation', 'startup', 'code'],
    'business and economy': ['business', 'market', 'economy', 'finance', 'trade', 'company', 'investment'],
    'science and discovery': ['science', 'research', 'study', 'discovery', 'space', 'climate', 'nature'],
    'culture and society': ['culture', 'art', 'music', 'film', 'book', 'society', 'people', 'community'],
    'politics and governance': ['government', 'politics', 'election', 'policy', 'law', 'democracy'],
    'global events': ['world', 'international', 'global', 'country', 'nation', 'war', 'peace'],
    'urban life and cities': ['city', 'urban', 'architecture', 'building', 'street', 'neighborhood'],
    'knowledge and learning': ['education', 'learning', 'university', 'school', 'knowledge', 'wisdom']
  };

  let bestTheme = 'abstract concepts and ideas';
  let bestScore = 0;

  for (const [theme, keywords] of Object.entries(themeMap)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme;
    }
  }

  return bestTheme;
}

/**
 * Generate thumbnail using Cloudflare AI Workers (Stable Diffusion)
 * Falls back to DiceBear if AI generation fails or is unavailable
 * Enforces 100 images/day free tier limit
 */
export async function generateThumbnail(article: NewsArticle, env?: Env): Promise<Blob | null> {
  // Temporarily disable AI generation for testing
  return null;

  // Try AI generation first if env is available (has AI binding)
  if (env && (env as any).AI) {
    try {
      // Check if we've exceeded daily free limit (60 images/day)
      const canUseAI = await checkAIQuota(env);

      if (canUseAI) {
        const aiGenerated = await generateAIThumbnail(article, env);
        if (aiGenerated) {
          // Increment usage counter
          await incrementAIUsage(env);
          return aiGenerated;
        }
      } else {
        console.log('AI quota exceeded for today, using pattern fallback');
      }
    } catch (error) {
      console.error('AI thumbnail generation failed, falling back to pattern:', error);
    }
  }

  // Fallback to pattern-based generation
  return generatePatternThumbnail(article);
}

/**
 * Check if we can use AI generation (under 60/day limit)
 */
async function checkAIQuota(env: Env): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `ai-usage:${today}`;

  const usage = await env.NEWS_KV.get(key);
  const count = usage ? parseInt(usage) : 0;

  return count < 60; // Daily limit to save costs
}

/**
 * Increment AI usage counter for the day
 */
async function incrementAIUsage(env: Env): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `ai-usage:${today}`;

  const usage = await env.NEWS_KV.get(key);
  const count = usage ? parseInt(usage) : 0;

  // Store with 24 hour expiration (auto-reset daily)
  await env.NEWS_KV.put(key, (count + 1).toString(), {
    expirationTtl: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Generate AI artwork using Cloudflare AI Workers
 */
async function generateAIThumbnail(article: NewsArticle, env: Env): Promise<Blob | null> {
  try {
    const ai = (env as any).AI;
    if (!ai) {
      return null;
    }

    const prompt = generateArtisticPrompt(article);

    console.log(`Generating AI artwork for ${article.id}: ${prompt}`);

    // Use Cloudflare AI's Stable Diffusion XL Lightning (fast and free!)
    const response = await ai.run(
      '@cf/bytedance/stable-diffusion-xl-lightning',
      {
        prompt: prompt,
        num_steps: 4, // Lightning model needs fewer steps
        guidance: 7.5,
      }
    );

    // Response is a Uint8Array of PNG data
    if (response && response instanceof Uint8Array) {
      return new Blob([response], { type: 'image/png' });
    }

    return null;
  } catch (error) {
    console.error('Error generating AI thumbnail:', error);
    return null;
  }
}

/**
 * Fallback: Generate pattern-based thumbnail using DiceBear
 */
async function generatePatternThumbnail(article: NewsArticle): Promise<Blob | null> {
  try {
    const seed = encodeURIComponent(article.id);
    const styles = ['shapes', 'identicon'];
    const styleIndex = Math.abs(hashCode(article.id)) % styles.length;

    const thumbnailUrl = `https://api.dicebear.com/7.x/${styles[styleIndex]}/png?seed=${seed}&size=400`;

    const response = await fetch(thumbnailUrl);

    if (!response.ok) {
      // Silently fail and return null - will use URL-based fallback
      return null;
    }

    return await response.blob();
  } catch (error) {
    // Silently fail and return null
    return null;
  }
}

/**
 * Generate a simple URL-based thumbnail (final fallback)
 */
export function generateSimpleThumbnailUrl(article: NewsArticle): string {
  const colors = [
    'FF6B6B-4ECDC4', // Red to Teal
    '6C5CE7-A29BFE', // Purple to Light Purple
    'FD79A8-FDCB6E', // Pink to Yellow
    '00B894-00CEC9', // Green to Cyan
    'E17055-FDCB6E', // Orange to Yellow
    '0984E3-74B9FF', // Blue to Light Blue
  ];

  const colorPair = colors[Math.abs(hashCode(article.id)) % colors.length];
  const title = encodeURIComponent(article.transformedTitle || article.originalTitle);

  return `https://via.placeholder.com/400x300/${colorPair}/FFFFFF?text=${title.slice(0, 50)}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}
