import { Env, NewsArticle } from './types';
import { crawlT24, fetchT24ArticleDetail } from './crawlers/t24';
import { crawlEksisozluk, fetchEksisozlukDetail } from './crawlers/eksisozluk';
import { crawlHackerNews } from './crawlers/hackernews';
import { crawlWikipedia } from './crawlers/wikipedia';
import { crawlReddit } from './crawlers/reddit';
import { transformContent } from './transformers/content';
import { saveArticleToR2, listArticles, getArticleFromR2 } from './utils/storage';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for API access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    if (url.pathname === '/api/articles') {
      return handleGetArticles(url, env, corsHeaders);
    }

    if (url.pathname.startsWith('/api/article/')) {
      return handleGetArticle(url, env, corsHeaders);
    }

    if (url.pathname.startsWith('/thumbnails/')) {
      return handleGetThumbnail(url, env);
    }

    if (url.pathname === '/api/crawl' && request.method === 'POST') {
      // Manual trigger for testing
      return handleManualCrawl(request, env, ctx, corsHeaders);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());

    // Determine which sources to crawl based on time
    const hour = new Date(event.scheduledTime).getUTCHours();
    const shouldCrawlTurkish = hour >= 6 && hour <= 15; // 10 PM - 7 AM PST
    const shouldCrawlEnglish = (hour >= 17 && hour <= 23) || (hour >= 0 && hour <= 2); // 9 AM - 6 PM PST

    const allArticles: NewsArticle[] = [];

    try {
      if (shouldCrawlTurkish) {
        console.log('Crawling Turkish sources...');
        const [t24Articles, eksiArticles] = await Promise.all([
          crawlT24(env),
          crawlEksisozluk(env),
        ]);

        // Fetch full content for articles
        for (const article of t24Articles) {
          if (!article.originalContent) {
            article.originalContent = await fetchT24ArticleDetail(article.originalUrl, env);
          }
        }

        for (const article of eksiArticles) {
          if (!article.originalContent) {
            article.originalContent = await fetchEksisozlukDetail(article.originalUrl, env);
          }
        }

        allArticles.push(...t24Articles, ...eksiArticles);
      }

      if (shouldCrawlEnglish) {
        console.log('Crawling English sources...');
        const [hnArticles, wikiArticles, redditArticles] = await Promise.all([
          crawlHackerNews(),
          crawlWikipedia(),
          crawlReddit(env),
        ]);

        allArticles.push(...hnArticles, ...wikiArticles, ...redditArticles);
      }

      if (allArticles.length === 0) {
        console.log('No articles to process at this time');
        return;
      }

      // Transform content with AI
      console.log(`Transforming ${allArticles.length} articles...`);
      const transformedArticles = await batchTransformContent(allArticles, env);

      // Save to R2
      console.log('Saving articles to R2...');
      await Promise.all(
        transformedArticles.map(article => saveArticleToR2(article, env))
      );

      console.log(`Successfully processed ${transformedArticles.length} articles`);
    } catch (error) {
      console.error('Error in scheduled job:', error);
    }
  },
};

async function handleGetArticles(url: URL, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const source = url.searchParams.get('source') as NewsArticle['source'] | null;
  const limit = parseInt(url.searchParams.get('limit') || '20');

  try {
    const articles = await listArticles(source, limit, env);

    return new Response(JSON.stringify({ articles, count: articles.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting articles:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetArticle(url: URL, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const pathParts = url.pathname.split('/');
  const articleId = pathParts[pathParts.length - 1];

  if (!articleId) {
    return new Response(JSON.stringify({ error: 'Article ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Extract source from article ID
    const source = articleId.split('-')[0] as NewsArticle['source'];
    const article = await getArticleFromR2(articleId, source, env);

    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting article:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetThumbnail(url: URL, env: Env): Promise<Response> {
  const thumbnailKey = url.pathname.substring(1); // Remove leading slash

  try {
    const object = await env.NEWS_BUCKET.get(thumbnailKey);

    if (!object) {
      return new Response('Thumbnail not found', { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

async function handleManualCrawl(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { sources?: string[] };
    const sources = body.sources || ['all'];

    const allArticles: NewsArticle[] = [];

    if (sources.includes('all') || sources.includes('turkish') || sources.includes('t24')) {
      const t24Articles = await crawlT24(env);
      // Fetch full content for articles
      for (const article of t24Articles) {
        if (!article.originalContent) {
          article.originalContent = await fetchT24ArticleDetail(article.originalUrl, env);
        }
      }
      allArticles.push(...t24Articles);
    }

    if (sources.includes('all') || sources.includes('turkish') || sources.includes('eksisozluk')) {
      const eksiArticles = await crawlEksisozluk(env);
      // Fetch full content for articles
      for (const article of eksiArticles) {
        if (!article.originalContent) {
          article.originalContent = await fetchEksisozlukDetail(article.originalUrl, env);
        }
      }
      allArticles.push(...eksiArticles);
    }

    if (sources.includes('all') || sources.includes('english') || sources.includes('hackernews')) {
      const hnArticles = await crawlHackerNews();
      allArticles.push(...hnArticles);
    }

    if (sources.includes('all') || sources.includes('english') || sources.includes('wikipedia')) {
      const wikiArticles = await crawlWikipedia();
      allArticles.push(...wikiArticles);
    }

    if (sources.includes('all') || sources.includes('english') || sources.includes('reddit')) {
      const redditArticles = await crawlReddit(env);
      allArticles.push(...redditArticles);
    }

    // Process articles in background to avoid timeout
    ctx.waitUntil(
      (async () => {
        try {
          // Process articles one at a time to avoid timeout
          let processedCount = 0;
          for (const article of allArticles) {
            try {
              // Transform and save immediately
              const transformed = await transformContent(article, env);
              await saveArticleToR2(transformed, env);
              processedCount++;
            } catch (error) {
              console.error(`Error processing article ${article.id}:`, error);
              // Save without transformation on error
              await saveArticleToR2(article, env);
              processedCount++;
            }
          }
          console.log(`Successfully processed ${processedCount} articles`);
        } catch (error) {
          console.error('Error processing articles in background:', error);
        }
      })()
    );

    // Return immediately with crawled count
    return new Response(
      JSON.stringify({ success: true, count: allArticles.length, status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in manual crawl:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
