import type { NewsProvider, ProviderConfig, NewsArticle, Env } from "../types";

/**
 * Abstract base class for news providers
 * Provides common functionality and enforces the provider interface
 */
export abstract class BaseProvider implements NewsProvider {
	constructor(public readonly config: ProviderConfig) {}

	/**
	 * Crawl articles from the news source
	 * Must be implemented by each provider
	 */
	abstract crawl(limit: number, env: Env): Promise<NewsArticle[]>;

	/**
	 * Enrich article with full content (optional)
	 * Override this if the provider needs to fetch full content separately
	 */
	async enrichContent(article: NewsArticle, env: Env): Promise<NewsArticle> {
		return article;
	}

	/**
	 * Check if the provider can run
	 * Override this if the provider has specific requirements
	 */
	canRun(env: Env): boolean {
		return true;
	}

	/**
	 * Generate a unique article ID
	 */
	protected generateId(sourceId: string | number): string {
		return `${this.config.id}-${sourceId}`;
	}

	/**
	 * Log a message with provider context
	 */
	protected log(message: string, ...args: any[]): void {
		console.log(`[${this.config.name}] ${message}`, ...args);
	}

	/**
	 * Log an error with provider context
	 */
	protected error(message: string, ...args: any[]): void {
		console.error(`[${this.config.name}] ${message}`, ...args);
	}
}
