import { BaseProvider } from "./base.provider";
import type { NewsArticle, Env } from "../types";
import { fetchWithScrapeDo, extractArticleContent } from "../utils/scraper";

/**
 * T24 News Provider
 * Fetches news from T24 RSS feed
 */
export class T24Provider extends BaseProvider {
	constructor() {
		super({
			id: "t24",
			name: "T24",
			enabled: true,
			language: "tr",
			defaultLimit: 10,
			fetchFullContent: true,
		});
	}

	async crawl(limit: number, env: Env): Promise<NewsArticle[]> {
		try {
			// Use RSS feed - no Cloudflare protection!
			const response = await fetch("https://t24.com.tr/rss");
			const xml = await response.text();

			const articles: NewsArticle[] = [];

			// Parse RSS XML
			const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
			const items = xml.matchAll(itemRegex);

			for (const item of items) {
				const itemContent = item[1];

				// Extract title
				const titleMatch = itemContent.match(
					/<title><!\[CDATA\[(.*?)\]\]><\/title>/
				);
				const title = titleMatch ? titleMatch[1].trim() : "";

				// Extract link
				const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
				const url = linkMatch ? linkMatch[1].trim() : "";

				// Extract description as initial content
				const descMatch = itemContent.match(
					/<description><!\[CDATA\[(.*?)\]\]><\/description>/
				);
				const description = descMatch ? descMatch[1].trim() : "";

				if (title && url) {
					articles.push({
						id: this.generateId(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
						source: "t24",
						originalTitle: title,
						originalContent: description,
						originalUrl: url,
						crawledAt: new Date().toISOString(),
						language: "tr",
					});
				}

				if (articles.length >= limit) break;
			}

			this.log(`Crawled ${articles.length} articles from RSS`);
			return articles;
		} catch (error) {
			this.error("Error crawling:", error);
			return [];
		}
	}

	async enrichContent(article: NewsArticle, env: Env): Promise<NewsArticle> {
		try {
			// Only fetch full content if description is too short
			if (article.originalContent.length < 100) {
				const html = await fetchWithScrapeDo(article.originalUrl, env);
				const fullContent = extractArticleContent(html);
				if (fullContent) {
					article.originalContent = fullContent;
				}
			}
			return article;
		} catch (error) {
			this.error("Error enriching content:", error);
			return article;
		}
	}

	canRun(env: Env): boolean {
		// T24 RSS doesn't require special configuration
		return true;
	}
}
