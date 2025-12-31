import type { NewsProvider, ProviderResult, Env, NewsArticle } from "../types";

/**
 * Registry for managing all news providers
 * Providers can be added/removed without affecting the system
 */
export class ProviderRegistry {
	private providers = new Map<string, NewsProvider>();

	/**
	 * Register a news provider
	 */
	register(provider: NewsProvider): void {
		this.providers.set(provider.config.id, provider);
		console.log(`[ProviderRegistry] Registered provider: ${provider.config.id}`);
	}

	/**
	 * Unregister a news provider
	 */
	unregister(providerId: string): void {
		this.providers.delete(providerId);
		console.log(`[ProviderRegistry] Unregistered provider: ${providerId}`);
	}

	/**
	 * Get a provider by ID
	 */
	get(providerId: string): NewsProvider | undefined {
		return this.providers.get(providerId);
	}

	/**
	 * Get all registered providers
	 */
	getAll(): NewsProvider[] {
		return Array.from(this.providers.values());
	}

	/**
	 * Get all enabled providers
	 */
	getEnabled(env: Env): NewsProvider[] {
		return this.getAll().filter(
			(p) => p.config.enabled && p.canRun(env)
		);
	}

	/**
	 * Get enabled providers by language
	 */
	getByLanguage(language: "tr" | "en", env: Env): NewsProvider[] {
		return this.getEnabled(env).filter((p) => p.config.language === language);
	}

	/**
	 * Get provider by source name
	 */
	getBySource(source: string): NewsProvider | undefined {
		return this.getAll().find((p) => p.config.id === source);
	}

	/**
	 * Crawl a specific provider
	 */
	async crawlProvider(
		providerId: string,
		limit: number,
		env: Env
	): Promise<ProviderResult> {
		const provider = this.get(providerId);

		if (!provider) {
			return {
				providerId,
				articles: [],
				errors: [`Provider ${providerId} not found`],
				duration: 0,
			};
		}

		if (!provider.config.enabled) {
			return {
				providerId,
				articles: [],
				errors: [`Provider ${providerId} is disabled`],
				duration: 0,
			};
		}

		if (!provider.canRun(env)) {
			return {
				providerId,
				articles: [],
				errors: [`Provider ${providerId} cannot run (missing configuration)`],
				duration: 0,
			};
		}

		const startTime = Date.now();
		try {
			console.log(`[ProviderRegistry] Crawling ${providerId}...`);
			let articles = await provider.crawl(limit, env);

			// Enrich content if provider supports it
			if (provider.enrichContent) {
				console.log(`[ProviderRegistry] Enriching ${articles.length} articles from ${providerId}...`);
				articles = await Promise.all(
					articles.map((article) => provider.enrichContent!(article, env))
				);
			}

			const duration = Date.now() - startTime;
			console.log(`[ProviderRegistry] ✓ Crawled ${articles.length} articles from ${providerId} in ${duration}ms`);

			return {
				providerId,
				articles,
				duration,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			console.error(`[ProviderRegistry] ✗ Error crawling ${providerId}:`, error);
			return {
				providerId,
				articles: [],
				errors: [error instanceof Error ? error.message : String(error)],
				duration,
			};
		}
	}

	/**
	 * Crawl multiple providers in parallel
	 */
	async crawlMultiple(
		providerIds: string[],
		limit: number,
		env: Env
	): Promise<ProviderResult[]> {
		console.log(`[ProviderRegistry] Crawling ${providerIds.length} providers...`);

		const results = await Promise.allSettled(
			providerIds.map((id) => this.crawlProvider(id, limit, env))
		);

		return results.map((result, index) => {
			if (result.status === "fulfilled") {
				return result.value;
			} else {
				return {
					providerId: providerIds[index] || "unknown",
					articles: [],
					errors: [result.reason?.message || "Unknown error"],
					duration: 0,
				};
			}
		});
	}

	/**
	 * Crawl all enabled providers
	 */
	async crawlAll(limit: number, env: Env): Promise<ProviderResult[]> {
		const enabledProviders = this.getEnabled(env);
		const providerIds = enabledProviders.map((p) => p.config.id);

		console.log(`[ProviderRegistry] Crawling all ${providerIds.length} enabled providers:`, providerIds);

		return this.crawlMultiple(providerIds, limit, env);
	}

	/**
	 * Get list of all provider IDs
	 */
	listProviderIds(): string[] {
		return Array.from(this.providers.keys());
	}

	/**
	 * Check if a provider exists
	 */
	has(providerId: string): boolean {
		return this.providers.has(providerId);
	}

	/**
	 * Get provider count
	 */
	count(): number {
		return this.providers.size;
	}
}

// Global registry instance
export const registry = new ProviderRegistry();
