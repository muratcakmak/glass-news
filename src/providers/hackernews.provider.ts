import { BaseProvider } from "./base.provider";
import type { NewsArticle, Env } from "../types";

/**
 * HackerNews provider
 * Fetches top stories from Hacker News API
 */
export class HackerNewsProvider extends BaseProvider {
	constructor() {
		super({
			id: "hackernews",
			name: "Hacker News",
			enabled: true,
			language: "en",
			defaultLimit: 15,
			fetchFullContent: true,
		});
	}

	async crawl(limit: number, env: Env): Promise<NewsArticle[]> {
		try {
			// Use HN's official API for top stories
			const topStoriesResponse = await fetch(
				"https://hacker-news.firebaseio.com/v0/topstories.json"
			);
			const topStoryIds: number[] = await topStoriesResponse.json();

			const articles: NewsArticle[] = [];

			// Fetch top N stories
			for (const id of topStoryIds.slice(0, limit)) {
				try {
					const itemResponse = await fetch(
						`https://hacker-news.firebaseio.com/v0/item/${id}.json`
					);
					const item = await itemResponse.json();

					if (item && item.title) {
						articles.push({
							id: this.generateId(id),
							source: "hackernews",
							originalTitle: item.title,
							originalContent: item.text || item.title,
							originalUrl:
								item.url || `https://news.ycombinator.com/item?id=${id}`,
							crawledAt: new Date().toISOString(),
							publishedAt: new Date(item.time * 1000).toISOString(),
							language: "en",
							tags: item.type ? [item.type] : [],
						});
					}
				} catch (error) {
					this.error(`Error fetching item ${id}:`, error);
				}
			}

			this.log(`Crawled ${articles.length} articles`);
			return articles;
		} catch (error) {
			this.error("Error crawling:", error);
			return [];
		}
	}

	/**
	 * Enrich article with HN comments
	 */
	async enrichContent(article: NewsArticle, env: Env): Promise<NewsArticle> {
		try {
			// Extract HN item ID from article ID
			const itemId = article.id.replace("hackernews-", "");

			if (article.originalUrl.includes("news.ycombinator.com")) {
				const response = await fetch(
					`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`
				);
				const item = await response.json();

				if (item.kids && item.kids.length > 0) {
					// Fetch top 5 comments
					const comments: string[] = [];
					for (const kidId of item.kids.slice(0, 5)) {
						const commentResponse = await fetch(
							`https://hacker-news.firebaseio.com/v0/item/${kidId}.json`
						);
						const comment = await commentResponse.json();
						if (comment && comment.text) {
							const cleanText = comment.text
								.replace(/<[^>]+>/g, "")
								.replace(/\s+/g, " ")
								.trim();
							comments.push(cleanText);
						}
					}

					if (comments.length > 0) {
						article.originalContent = `${article.originalTitle}\n\n${comments.join("\n\n---\n\n")}`;
					}
				}
			}

			return article;
		} catch (error) {
			this.error("Error enriching content:", error);
			return article;
		}
	}

	canRun(env: Env): boolean {
		// HackerNews doesn't require any special configuration
		return true;
	}
}
