import { NewsArticle, Env } from '../types';

export async function crawlReddit(env: Env): Promise<NewsArticle[]> {
  try {
    let accessToken = '';

    // Get OAuth token if credentials are available
    if (env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET) {
      const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials'
      });

      const authData = await authResponse.json();
      accessToken = authData.access_token;
    }

    // Fetch from multiple subreddits
    const subreddits = ['news', 'worldnews', 'technology'];
    const articles: NewsArticle[] = [];

    for (const subreddit of subreddits) {
      try {
        const headers: HeadersInit = accessToken
          ? { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'news-aggregator/1.0' }
          : { 'User-Agent': 'news-aggregator/1.0' };

        const response = await fetch(
          `https://oauth.reddit.com/r/${subreddit}/hot.json?limit=10`,
          { headers }
        );

        if (!response.ok) {
          // Fallback to public API if OAuth fails
          const publicResponse = await fetch(
            `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
            { headers: { 'User-Agent': 'news-aggregator/1.0' } }
          );
          const publicData = await publicResponse.json();
          articles.push(...parseRedditPosts(publicData, subreddit));
          continue;
        }

        const data = await response.json();
        articles.push(...parseRedditPosts(data, subreddit));
      } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error);
      }
    }

    return articles.slice(0, 15); // Limit total to 15 articles
  } catch (error) {
    console.error('Error crawling Reddit:', error);
    return [];
  }
}

function parseRedditPosts(data: any, subreddit: string): NewsArticle[] {
  const articles: NewsArticle[] = [];

  if (data?.data?.children) {
    for (const child of data.data.children) {
      const post = child.data;

      if (post && post.title) {
        articles.push({
          id: `reddit-${post.id}`,
          source: 'reddit',
          originalTitle: post.title,
          originalContent: post.selftext || post.title,
          originalUrl: post.url || `https://reddit.com${post.permalink}`,
          crawledAt: new Date().toISOString(),
          publishedAt: new Date(post.created_utc * 1000).toISOString(),
          language: 'en',
          tags: [subreddit, ...(post.link_flair_text ? [post.link_flair_text] : [])]
        });
      }
    }
  }

  return articles;
}
