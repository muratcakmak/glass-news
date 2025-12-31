import { NewsArticle, Env } from '../types';
import { fetchWithScrapeDo, extractArticleContent } from '../utils/scraper';

export async function crawlT24(env?: Env): Promise<NewsArticle[]> {
  try {
    // Use RSS feed - no Cloudflare protection!
    const response = await fetch('https://t24.com.tr/rss');
    const xml = await response.text();

    const articles: NewsArticle[] = [];

    // Parse RSS XML
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xml.matchAll(itemRegex);

    for (const item of items) {
      const itemContent = item[1];

      // Extract title
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Extract link
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const url = linkMatch ? linkMatch[1].trim() : '';

      // Extract description as initial content
      const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      const description = descMatch ? descMatch[1].trim() : '';

      if (title && url) {
        articles.push({
          id: `t24-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 't24',
          originalTitle: title,
          originalContent: description, // RSS description as initial content
          originalUrl: url,
          crawledAt: new Date().toISOString(),
          language: 'tr'
        });
      }

      // Limit to 10 articles per crawl
      if (articles.length >= 10) break;
    }

    console.log(`T24 RSS: Found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('Error crawling T24:', error);
    return [];
  }
}

export async function fetchT24ArticleDetail(url: string, env?: Env): Promise<string> {
  try {
    const html = await fetchWithScrapeDo(url, env);
    return extractArticleContent(html);
  } catch (error) {
    console.error('Error fetching T24 article detail:', error);
    return '';
  }
}
