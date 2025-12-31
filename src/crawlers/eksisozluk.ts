import { NewsArticle, Env } from '../types';
import { fetchWithScrapeDo, extractTextFromHTML } from '../utils/scraper';

export async function crawlEksisozluk(env?: Env): Promise<NewsArticle[]> {
  try {
    // Fetch gündem page directly (no Cloudflare protection!)
    const response = await fetch('https://eksisozluk.com/basliklar/gundem', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    });
    const html = await response.text();

    const articles: NewsArticle[] = [];

    // Parse topic titles using data-title and data-slug attributes
    const topicRegex = /<h1[^>]*data-title="([^"]*)"[^>]*data-slug="([^"]*)"/gi;
    const matches = html.matchAll(topicRegex);

    for (const match of matches) {
      const title = match[1]
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .trim();
      const slug = match[2];

      if (title && slug) {
        articles.push({
          id: `eksisozluk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 'eksisozluk',
          originalTitle: title,
          originalContent: '', // Will be fetched in detail
          originalUrl: `https://eksisozluk.com/${slug}`,
          crawledAt: new Date().toISOString(),
          language: 'tr'
        });
      }

      // Limit to 10 articles per crawl
      if (articles.length >= 10) break;
    }

    console.log(`Eksisozluk: Found ${articles.length} topics`);
    return articles;
  } catch (error) {
    console.error('Error crawling Eksisozluk:', error);
    return [];
  }
}

export async function fetchEksisozlukDetail(url: string, env?: Env): Promise<string> {
  try {
    const html = await fetchWithScrapeDo(url, env);

    // Extract the most popular entries (entries with highest likes)
    const entryRegex = /<div[^>]*id="entry_\d+"[^>]*>[\s\S]*?<div[^>]*class="content"[^>]*>([\s\S]*?)<\/div>/gi;
    const entries: string[] = [];

    let match;
    let count = 0;
    while ((match = entryRegex.exec(html)) !== null && count < 5) {
      const content = extractTextFromHTML(match[1]);

      if (content && content.length > 20) {
        entries.push(content);
        count++;
      }
    }

    return entries.join('\n\n---\n\n');
  } catch (error) {
    console.error('Error fetching Eksisozluk detail:', error);
    return '';
  }
}
