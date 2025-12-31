import type { NewsArticle, Env } from "../types";
import { fetchWithScrapeDo, extractArticleContent } from "../utils/scraper";

export async function crawlBBC(env?: Env): Promise<NewsArticle[]> {
	try {
		const response = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml");
		const xml = await response.text();

		const articles: NewsArticle[] = [];

		// Parse RSS XML
		const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
		const items = xml.matchAll(itemRegex);

		for (const item of items) {
			if (!item) continue;
			const itemContent = item[1];
			if (!itemContent) continue;

			// Extract title
			const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
			let title = titleMatch?.[1]?.trim() || "";
			title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

			// Extract link
			const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
			const url = linkMatch?.[1]?.trim() || "";

			// Extract description
			const descMatch = itemContent.match(
				/<description>([\s\S]*?)<\/description>/,
			);
			let description = descMatch?.[1]?.trim() || "";
			description = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");

			if (title && url) {
				articles.push({
					id: `bbc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					source: "bbc",
					originalTitle: title,
					originalContent: description,
					originalUrl: url,
					crawledAt: new Date().toISOString(),
					language: "en",
				});
			}

			if (articles.length >= 10) break;
		}

		console.log(`BBC RSS: Found ${articles.length} articles`);
		return articles;
	} catch (error) {
		console.error("Error crawling BBC:", error);
		return [];
	}
}

export async function fetchBBCArticleDetail(
	url: string,
	env?: Env,
): Promise<string> {
	try {
		const html = await fetchWithScrapeDo(url, env);
		return extractArticleContent(html);
	} catch (error) {
		console.error("Error fetching BBC article detail:", error);
		return "";
	}
}
