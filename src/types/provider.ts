import type { NewsArticle } from "./article";
import type { Env } from "./env";

/**
 * Configuration for a news provider
 */
export interface ProviderConfig {
	/** Unique identifier for the provider */
	id: string;
	/** Display name */
	name: string;
	/** Whether the provider is enabled */
	enabled: boolean;
	/** Language of the content */
	language: "tr" | "en";
	/** Default number of articles to fetch */
	defaultLimit: number;
	/** Whether to fetch full content (vs. just headlines) */
	fetchFullContent: boolean;
}

/**
 * Base interface that all news providers must implement
 * This ensures providers are pluggable and interchangeable
 */
export interface NewsProvider {
	/** Provider configuration */
	readonly config: ProviderConfig;

	/**
	 * Crawl articles from the news source
	 * @param limit - Maximum number of articles to fetch
	 * @param env - Environment variables
	 * @returns Array of news articles
	 */
	crawl(limit: number, env: Env): Promise<NewsArticle[]>;

	/**
	 * Fetch full content for an article (if needed)
	 * @param article - Article to enrich
	 * @param env - Environment variables
	 * @returns Article with full content
	 */
	enrichContent?(article: NewsArticle, env: Env): Promise<NewsArticle>;

	/**
	 * Validate that the provider can run (check for API keys, etc.)
	 * @param env - Environment variables
	 * @returns true if provider can run, false otherwise
	 */
	canRun(env: Env): boolean;
}

/**
 * Result of a provider crawl operation
 */
export interface ProviderResult {
	providerId: string;
	articles: NewsArticle[];
	errors?: string[];
	duration: number;
}
