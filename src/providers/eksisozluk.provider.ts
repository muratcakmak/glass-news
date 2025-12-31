import { BaseProvider } from "./base.provider";
import type { NewsArticle, Env } from "../types";

/**
 * Eksisozluk Provider
 * Fetches trending topics from Eksisozluk
 */
export class EksisozlukProvider extends BaseProvider {
	constructor() {
		super({
			id: "eksisozluk",
			name: "Ekşi Sözlük",
			enabled: true,
			language: "tr",
			defaultLimit: 5,
			fetchFullContent: true,
		});
	}

	async crawl(limit: number, env: Env): Promise<NewsArticle[]> {
		try {
			this.log("Fetching gündem page...");

			const response = await fetch("https://eksisozluk.com/basliklar/gundem", {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
					Accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
					Referer: "https://eksisozluk.com/",
				},
			});

			if (!response.ok) {
				this.error(
					`Failed to fetch gündem: ${response.status} ${response.statusText}`
				);
				return [];
			}

			const html = await response.text();
			this.log(`HTML fetched, length: ${html.length} chars`);

			const articles: NewsArticle[] = [];

			// Parse topic titles using data-title and data-slug attributes
			const topicRegex =
				/<h1[^>]*data-title="([^"]*)"[^>]*data-slug="([^"]*)"/gi;
			const matches = html.matchAll(topicRegex);

			for (const match of matches) {
				const title = match[1]
					.replace(/&#x27;/g, "'")
					.replace(/&quot;/g, '"')
					.replace(/&amp;/g, "&")
					.replace(/&#x2B;/g, "+")
					.trim();
				const slug = match[2]?.trim();

				if (title && slug) {
					articles.push({
						id: this.generateId(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
						source: "eksisozluk",
						originalTitle: title,
						originalContent: "", // Will be fetched using Serper
						originalUrl: `https://eksisozluk.com/${slug}`,
						crawledAt: new Date().toISOString(),
						language: "tr",
					});
				}

				if (articles.length >= limit) break;
			}

			this.log(`Found ${articles.length} topics`);
			return articles;
		} catch (error) {
			this.error("Error crawling:", error);
			return [];
		}
	}

	async enrichContent(article: NewsArticle, env: Env): Promise<NewsArticle> {
		if (!env.SERPER_API_KEY) {
			this.error("No SERPER_API_KEY - cannot fetch content");
			return article;
		}

		try {
			const topicSlug = article.originalUrl.split("/").pop() || "";
			const searchBase = article.originalTitle || topicSlug.replace(/-/g, " ");
			const searchQuery = `${searchBase} haber -site:eksisozluk.com`;

			this.log(`Searching Google for context: "${searchQuery}"`);

			const response = await fetch("https://google.serper.dev/search", {
				method: "POST",
				headers: {
					"X-API-KEY": env.SERPER_API_KEY,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					q: searchQuery,
					num: 8,
					gl: "tr",
					hl: "tr",
				}),
			});

			if (!response.ok) {
				this.error(`SERPER API error: ${response.status} ${response.statusText}`);
				return article;
			}

			const data = (await response.json()) as any;
			this.log(`SERPER returned ${data.organic?.length || 0} results`);

			const snippets: string[] = [];

			if (data.answerBox?.snippet) {
				snippets.push(`Özet: ${data.answerBox.snippet}`);
			}
			if (data.answerBox?.answer) {
				snippets.push(`Cevap: ${data.answerBox.answer}`);
			}

			if (data.organic && Array.isArray(data.organic)) {
				for (const result of data.organic) {
					if (result.snippet) {
						snippets.push(`${result.title}: ${result.snippet}`);
					}
				}
			}

			if (snippets.length === 0) {
				this.error(`No snippets found for "${searchQuery}"`);
				return article;
			}

			article.originalContent = snippets.join("\n\n");
			this.log(`Collected ${snippets.length} snippets for context`);

			return article;
		} catch (error) {
			this.error("Error enriching content:", error);
			return article;
		}
	}

	canRun(env: Env): boolean {
		return !!env.SERPER_API_KEY;
	}
}
