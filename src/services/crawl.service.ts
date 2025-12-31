import type { Env, NewsArticle, ProviderResult } from "../types";
import { registry } from "../providers";

/**
 * Service for crawling news from providers
 */
export class CrawlService {
	/**
	 * Crawl a specific news source
	 */
	async crawlSource(source: string, limit: number, env: Env): Promise<NewsArticle[]> {
		const result = await registry.crawlProvider(source, limit, env);

		if (result.errors && result.errors.length > 0) {
			console.error(`[CrawlService] Errors crawling ${source}:`, result.errors);
		}

		return result.articles;
	}

	/**
	 * Crawl multiple sources
	 */
	async crawlMultiple(sources: string[], limit: number, env: Env): Promise<ProviderResult[]> {
		return registry.crawlMultiple(sources, limit, env);
	}

	/**
	 * Crawl all enabled sources
	 */
	async crawlAll(limit: number, env: Env): Promise<ProviderResult[]> {
		return registry.crawlAll(limit, env);
	}

	/**
	 * Get list of all available providers
	 */
	listProviders(): string[] {
		return registry.listProviderIds();
	}

	/**
	 * Get list of enabled providers
	 */
	listEnabledProviders(env: Env): string[] {
		return registry.getEnabled(env).map((p) => p.config.id);
	}
}

// Export singleton instance
export const crawlService = new CrawlService();
