import { NewsArticle, Env } from '../types';

const ORHAN_PAMUK_PROMPT = `You are a literary journalist combining the introspective, layered storytelling of Orhan Pamuk with the sharp, elegant prose of The New Yorker.

Transform this news article into a compelling English narrative that:
- Opens with a vivid scene or detail that draws readers in
- Weaves multiple perspectives and layers of meaning
- Uses rich, sensory language while remaining clear and accessible
- Finds the human story within the news
- Balances reportage with literary craft
- Maintains a contemplative yet engaging tone
- Keeps the essence and facts of the original story

CRITICAL: Output MUST be in English only. If the source article is in Turkish or any other language, translate it to English while transforming it into literary prose.

Original Title: {title}
Original Content: {content}
Source: {source}

Respond with a JSON object containing:
{
  "transformedTitle": "A literary, compelling English title (50-80 characters)",
  "transformedContent": "The transformed article in English (300-500 words)",
  "tags": ["3-5 relevant English tags"]
}`;

export async function transformContent(article: NewsArticle, env: Env): Promise<NewsArticle> {
  try {
    // Skip transformation if no API key or content is too short
    if (!env.OPENROUTER_API_KEY || article.originalContent.length < 50) {
      return {
        ...article,
        transformedTitle: article.originalTitle,
        transformedContent: article.originalContent,
        tags: article.tags || []
      };
    }

    const prompt = ORHAN_PAMUK_PROMPT
      .replace('{title}', article.originalTitle)
      .replace('{content}', article.originalContent.slice(0, 2000)) // Limit input length
      .replace('{source}', article.source);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://news-data.workers.dev',
        'X-Title': 'News Data Transformer'
      },
      body: JSON.stringify({
        model: env.RESEARCH_MODEL || 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', await response.text());
      return article;
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      ...article,
      transformedTitle: result.transformedTitle || article.originalTitle,
      transformedContent: result.transformedContent || article.originalContent,
      tags: result.tags || article.tags || []
    };
  } catch (error) {
    console.error('Error transforming content:', error);
    // Return original article on error
    return article;
  }
}

export async function batchTransformContent(articles: NewsArticle[], env: Env): Promise<NewsArticle[]> {
  // Transform articles in parallel with a limit to avoid rate limiting
  const batchSize = 5;
  const results: NewsArticle[] = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const transformed = await Promise.all(
      batch.map(article => transformContent(article, env))
    );
    results.push(...transformed);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
