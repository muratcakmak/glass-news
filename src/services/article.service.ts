import type { Env, NewsArticle } from "../types";
import { transformContent } from "../transformers/content";
import {
	articleRepository,
	indexRepository,
} from "../repositories";

/**
 * Service for article operations
 */
export class ArticleService {
	/**
	 * Get an article by ID
	 */
	async getArticle(
		articleId: string,
		source: string,
		env: Env
	): Promise<NewsArticle | null> {
		return articleRepository.findById(articleId, source, env);
	}

	/**
	 * List articles with optional filtering
	 */
	async listArticles(
		source: string | null,
		limit: number,
		env: Env
	): Promise<NewsArticle[]> {
		console.log(`[ArticleService] Listing articles: source=${source}, limit=${limit}`);

		// Get article IDs from index
		const index = await indexRepository.get(source, env);
		const articleIds = index.slice(0, limit);

		console.log(`[ArticleService] Found ${articleIds.length} article IDs`);

		// Fetch articles
		const articles = await articleRepository.findMany(articleIds, env);

		console.log(`[ArticleService] Returning ${articles.length} articles`);
		return articles;
	}

	/**
	 * Process an article (transform + save)
	 */
	async processArticle(article: NewsArticle, env: Env): Promise<NewsArticle> {
		console.log(`[ArticleService] Processing ${article.id}...`);

		try {
			// Transform content
			const transformed = await transformContent(article, env);

			// Save to R2
			const saved = await articleRepository.save(transformed, env);

			// Update index
			await indexRepository.add(saved.id, saved.source, env);

			console.log(`[ArticleService] ✓ Processed ${article.id}`);
			return saved;
		} catch (error) {
			console.error(`[ArticleService] Error processing ${article.id}:`, error);

			// Fallback: Save original article
			try {
				console.log(`[ArticleService] Fallback: Saving original ${article.id}`);
				const saved = await articleRepository.save(article, env);
				await indexRepository.add(saved.id, saved.source, env);
				return saved;
			} catch (fallbackError) {
				console.error(
					`[ArticleService] CRITICAL: Failed to save ${article.id}:`,
					fallbackError
				);
				throw fallbackError;
			}
		}
	}

	/**
	 * Process multiple articles
	 */
	async processArticles(
		articles: NewsArticle[],
		env: Env
	): Promise<NewsArticle[]> {
		const processed: NewsArticle[] = [];

		for (const article of articles) {
			try {
				const result = await this.processArticle(article, env);
				processed.push(result);
			} catch (error) {
				console.error(
					`[ArticleService] Failed to process ${article.id}:`,
					error
				);
			}
		}

		console.log(
			`[ArticleService] Processed ${processed.length}/${articles.length} articles`
		);
		return processed;
	}

	/**
	 * Delete an article
	 */
	async deleteArticle(
		articleId: string,
		source: string,
		env: Env
	): Promise<void> {
		await articleRepository.delete(articleId, source, env);
		await indexRepository.remove(articleId, source, env);
		console.log(`[ArticleService] Deleted ${articleId}`);
	}

	/**
	 * Save article without transformation (raw)
	 */
	async saveRawArticle(article: NewsArticle, env: Env): Promise<NewsArticle> {
		console.log(`[ArticleService] Saving raw article ${article.id}...`);

		try {
			// Save to R2 without transformation
			const saved = await articleRepository.save(article, env);

			// Update index
			await indexRepository.add(saved.id, saved.source, env);

			console.log(`[ArticleService] ✓ Saved raw article ${article.id}`);
			return saved;
		} catch (error) {
			console.error(`[ArticleService] Error saving raw article ${article.id}:`, error);
			throw error;
		}
	}

	/**
	 * Save multiple raw articles without transformation
	 */
	async saveRawArticles(articles: NewsArticle[], env: Env): Promise<NewsArticle[]> {
		const saved: NewsArticle[] = [];

		for (const article of articles) {
			try {
				const result = await this.saveRawArticle(article, env);
				saved.push(result);
			} catch (error) {
				console.error(
					`[ArticleService] Failed to save raw article ${article.id}:`,
					error
				);
			}
		}

		console.log(
			`[ArticleService] Saved ${saved.length}/${articles.length} raw articles`
		);
		return saved;
	}
}

// Export singleton instance
export const articleService = new ArticleService();
