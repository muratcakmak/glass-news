import type { Env } from "../types";
import {
	MAX_ARTICLES_PER_SOURCE,
	MAX_ARTICLES_GLOBAL,
	INDEX_TTL,
} from "../config/constants";

/**
 * Repository for managing article indexes in KV
 */
export class IndexRepository {
	/**
	 * Add an article ID to the index
	 */
	async add(articleId: string, source: string, env: Env): Promise<void> {
		try {
			console.log(
				`[IndexRepo] Adding ${articleId} to index for source: ${source}`
			);

			// Update source-specific index
			const indexKey = `index:${source}`;
			const existingIndex =
				((await env.NEWS_KV.get(indexKey, "json")) as string[]) || [];

			const updatedIndex = [
				articleId,
				...existingIndex.filter((id) => id !== articleId),
			];
			const trimmedIndex = updatedIndex.slice(0, MAX_ARTICLES_PER_SOURCE);

			await env.NEWS_KV.put(indexKey, JSON.stringify(trimmedIndex), {
				expirationTtl: INDEX_TTL,
			});

			console.log(
				`[IndexRepo] Saved ${trimmedIndex.length} articles to ${indexKey}`
			);

			// Update global index
			const globalIndexKey = "index:all";
			const globalIndex =
				((await env.NEWS_KV.get(globalIndexKey, "json")) as string[]) || [];
			const updatedGlobalIndex = [
				articleId,
				...globalIndex.filter((id) => id !== articleId),
			];
			const trimmedGlobalIndex = updatedGlobalIndex.slice(
				0,
				MAX_ARTICLES_GLOBAL
			);

			await env.NEWS_KV.put(
				globalIndexKey,
				JSON.stringify(trimmedGlobalIndex),
				{
					expirationTtl: INDEX_TTL,
				}
			);

			console.log(`[IndexRepo] Successfully updated global index`);
		} catch (error) {
			console.error(`[IndexRepo] Error adding to index:`, error);
			throw error;
		}
	}

	/**
	 * Get an index by source (or all)
	 */
	async get(source: string | null, env: Env): Promise<string[]> {
		try {
			const indexKey = source ? `index:${source}` : "index:all";
			const index =
				((await env.NEWS_KV.get(indexKey, "json")) as string[]) || [];
			return index;
		} catch (error) {
			console.error(`[IndexRepo] Error getting index:`, error);
			return [];
		}
	}

	/**
	 * Clear all indexes
	 */
	async clearAll(env: Env): Promise<string[]> {
		const sources = [
			"hackernews",
			"wikipedia",
			"reddit",
			"eksisozluk",
			"t24",
			"webrazzi",
			"bbc",
		];
		const keysToDelete: string[] = ["index:all"];

		for (const source of sources) {
			keysToDelete.push(`index:${source}`);
		}

		for (const key of keysToDelete) {
			await env.NEWS_KV.delete(key);
		}

		console.log(`[IndexRepo] Cleared ${keysToDelete.length} indexes`);
		return keysToDelete;
	}

	/**
	 * Remove an article from indexes
	 */
	async remove(articleId: string, source: string, env: Env): Promise<void> {
		// Remove from source-specific index
		const indexKey = `index:${source}`;
		const existingIndex =
			((await env.NEWS_KV.get(indexKey, "json")) as string[]) || [];
		const updatedIndex = existingIndex.filter((id) => id !== articleId);

		await env.NEWS_KV.put(indexKey, JSON.stringify(updatedIndex), {
			expirationTtl: INDEX_TTL,
		});

		// Remove from global index
		const globalIndexKey = "index:all";
		const globalIndex =
			((await env.NEWS_KV.get(globalIndexKey, "json")) as string[]) || [];
		const updatedGlobalIndex = globalIndex.filter((id) => id !== articleId);

		await env.NEWS_KV.put(globalIndexKey, JSON.stringify(updatedGlobalIndex), {
			expirationTtl: INDEX_TTL,
		});

		console.log(`[IndexRepo] Removed ${articleId} from indexes`);
	}
}

// Export singleton instance
export const indexRepository = new IndexRepository();
