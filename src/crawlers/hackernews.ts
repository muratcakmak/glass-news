import { NewsArticle } from '../types';

export async function crawlHackerNews(): Promise<NewsArticle[]> {
  try {
    // Use HN's official API for top stories
    const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const topStoryIds: number[] = await topStoriesResponse.json();

    const articles: NewsArticle[] = [];

    // Fetch top 15 stories
    for (const id of topStoryIds.slice(0, 15)) {
      try {
        const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const item = await itemResponse.json();

        if (item && item.title) {
          articles.push({
            id: `hn-${id}`,
            source: 'hackernews',
            originalTitle: item.title,
            originalContent: item.text || item.title, // Some stories don't have text
            originalUrl: item.url || `https://news.ycombinator.com/item?id=${id}`,
            crawledAt: new Date().toISOString(),
            publishedAt: new Date(item.time * 1000).toISOString(),
            language: 'en',
            tags: item.type ? [item.type] : []
          });
        }
      } catch (error) {
        console.error(`Error fetching HN item ${id}:`, error);
      }
    }

    return articles;
  } catch (error) {
    console.error('Error crawling HackerNews:', error);
    return [];
  }
}

export async function fetchHNArticleContent(url: string): Promise<string> {
  // For external links, we'll need to fetch the actual article
  // For now, we'll just use the title and any comments
  try {
    if (url.includes('news.ycombinator.com')) {
      const itemId = url.match(/id=(\d+)/)?.[1];
      if (itemId) {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
        const item = await response.json();

        if (item.kids && item.kids.length > 0) {
          // Fetch top comments
          const comments: string[] = [];
          for (const kidId of item.kids.slice(0, 5)) {
            const commentResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${kidId}.json`);
            const comment = await commentResponse.json();
            if (comment && comment.text) {
              comments.push(comment.text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
            }
          }
          return comments.join('\n\n---\n\n');
        }
      }
    }
    return '';
  } catch (error) {
    console.error('Error fetching HN content:', error);
    return '';
  }
}
