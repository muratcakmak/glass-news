import { NewsArticle } from '../types';

export async function crawlWikipedia(): Promise<NewsArticle[]> {
  try {
    const headers = {
      'User-Agent': 'NewsAggregator/1.0 (https://news-data.workers.dev; news@example.com)',
      'Api-User-Agent': 'NewsAggregator/1.0'
    };

    // Get current events from Wikipedia
    const response = await fetch(
      'https://en.wikipedia.org/api/rest_v1/page/summary/Portal:Current_events',
      { headers }
    );
    const data = await response.json();

    // Also get featured articles
    const featuredResponse = await fetch(
      'https://en.wikipedia.org/api/rest_v1/feed/featured/' +
      new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      { headers }
    );
    const featuredData = await featuredResponse.json();

    const articles: NewsArticle[] = [];

    // Add current events summary
    if (data.extract) {
      articles.push({
        id: `wiki-current-events-${Date.now()}`,
        source: 'wikipedia',
        originalTitle: 'Current Events',
        originalContent: data.extract,
        originalUrl: data.content_urls?.desktop?.page || 'https://en.wikipedia.org/wiki/Portal:Current_events',
        crawledAt: new Date().toISOString(),
        language: 'en',
        tags: ['current-events']
      });
    }

    // Add featured article
    if (featuredData.tfa) {
      articles.push({
        id: `wiki-featured-${Date.now()}`,
        source: 'wikipedia',
        originalTitle: featuredData.tfa.title || 'Today\'s Featured Article',
        originalContent: featuredData.tfa.extract,
        originalUrl: featuredData.tfa.content_urls?.desktop?.page || '',
        crawledAt: new Date().toISOString(),
        language: 'en',
        tags: ['featured']
      });
    }

    // Add "In the news" items
    if (featuredData.news && Array.isArray(featuredData.news)) {
      for (const newsItem of featuredData.news.slice(0, 5)) {
        if (newsItem.story) {
          articles.push({
            id: `wiki-news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: 'wikipedia',
            originalTitle: newsItem.story.replace(/<[^>]+>/g, '').trim(),
            originalContent: newsItem.story.replace(/<[^>]+>/g, '').trim(),
            originalUrl: newsItem.links?.[0]?.content_urls?.desktop?.page || 'https://en.wikipedia.org',
            crawledAt: new Date().toISOString(),
            language: 'en',
            tags: ['news']
          });
        }
      }
    }

    return articles;
  } catch (error) {
    console.error('Error crawling Wikipedia:', error);
    return [];
  }
}
