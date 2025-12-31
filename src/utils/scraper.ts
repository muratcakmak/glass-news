import { Env } from '../types';

/**
 * Enhanced HTML fetching using ScrapeDo API (bypasses anti-bot protection)
 * Falls back to regular fetch if ScrapeDo is not configured
 */
export async function fetchWithScrapeDo(url: string, env?: Env): Promise<string> {
  // Use ScrapeDo if API key is available
  if (env?.SCRAPEDO_API_KEY) {
    try {
      const scrapeDoUrl = `https://api.scrape.do?token=${env.SCRAPEDO_API_KEY}&url=${encodeURIComponent(url)}`;

      const response = await fetch(scrapeDoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
        },
      });

      if (response.ok) {
        console.log(`Successfully fetched ${url} via ScrapeDo`);
        return await response.text();
      } else {
        console.warn(`ScrapeDo failed for ${url}: ${response.statusText}, falling back to direct fetch`);
      }
    } catch (error) {
      console.error(`ScrapeDo error for ${url}:`, error);
    }
  }

  // Fallback to direct fetch
  return fetchDirectly(url);
}

/**
 * Direct fetch with proper headers
 */
export async function fetchDirectly(url: string): Promise<string> {
  const isTurkish = url.includes('.tr') || url.includes('eksisozluk');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': isTurkish ? 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' : 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Use Serper API to search for trending news
 * Returns URLs of news articles
 */
export async function searchWithSerper(query: string, env: Env): Promise<string[]> {
  if (!env.SERPER_API_KEY) {
    console.warn('SERPER_API_KEY not configured, skipping search');
    return [];
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
        gl: query.includes('türk') || query.includes('tr') ? 'tr' : 'us',
        hl: query.includes('türk') || query.includes('tr') ? 'tr' : 'en',
      }),
    });

    if (!response.ok) {
      console.error(`Serper API error: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    // Extract URLs from organic results
    const urls: string[] = [];
    if (data.organic) {
      for (const result of data.organic) {
        if (result.link) {
          urls.push(result.link);
        }
      }
    }

    console.log(`Serper found ${urls.length} results for: ${query}`);
    return urls;
  } catch (error) {
    console.error('Serper API error:', error);
    return [];
  }
}

/**
 * Extract clean text content from HTML
 */
export function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extract article content from HTML using common patterns
 */
export function extractArticleContent(html: string): string {
  // Try common article content selectors
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const content = extractTextFromHTML(match[1]);
      if (content.length > 100) {
        return content;
      }
    }
  }

  // Fallback: extract all text
  return extractTextFromHTML(html);
}
