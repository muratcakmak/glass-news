import type { NewsArticle, Env } from "../types";
import { generateThumbnail } from "../transformers/thumbnail";
import { THUMBNAIL_CACHE_CONTROL } from "../config/constants";

/**
 * Repository for article operations in R2
 */
export class ArticleRepository {
	/**
	 * Save an article to R2 with thumbnail generation
	 */
	async save(article: NewsArticle, env: Env): Promise<NewsArticle> {
		try {
			// Generate and upload thumbnail
			console.log(
				`[ArticleRepo] Generating thumbnail for ${article.id}...`
			);
			const thumbnail = await generateThumbnail(article, env);
			let thumbnailUrl = "";

			if (thumbnail) {
				console.log(
					`[ArticleRepo] Generated thumbnail - Size: ${thumbnail.size} bytes, Type: ${thumbnail.type}`
				);

				const extension = thumbnail.type.includes("png") ? "png" : "jpg";
				const thumbnailKey = `thumbnails/${article.id}.${extension}`;

				try {
					await env.NEWS_BUCKET.put(thumbnailKey, thumbnail, {
						httpMetadata: {
							contentType: thumbnail.type || "image/png",
							cacheControl: THUMBNAIL_CACHE_CONTROL,
						},
					});
					thumbnailUrl = `/thumbnails/${article.id}.${extension}`;
					console.log(
						`[ArticleRepo] Successfully uploaded thumbnail to ${thumbnailKey}`
					);
				} catch (uploadError) {
					console.error(
						`[ArticleRepo] Failed to upload thumbnail for ${article.id}:`,
						uploadError
					);
				}
			} else {
				console.log(
					`[ArticleRepo] Thumbnail generation failed or returned null`
				);
			}

			// Save article with thumbnail URL
			const articleWithThumbnail = {
				...article,
				thumbnailUrl,
			};

			// Store the article as JSON
			const articleKey = `articles/${article.source}/${article.id}.json`;
			await env.NEWS_BUCKET.put(
				articleKey,
				JSON.stringify(articleWithThumbnail, null, 2),
				{
					httpMetadata: {
						contentType: "application/json",
					},
					customMetadata: {
						source: article.source,
						language: article.language,
						crawledAt: article.crawledAt,
					},
				}
			);

			console.log(`[ArticleRepo] Saved article ${article.id} to R2`);
			return articleWithThumbnail;
		} catch (error) {
			console.error(`[ArticleRepo] Error saving article ${article.id}:`, error);
			throw error;
		}
	}

	/**
	 * Get an article from R2 by ID
	 */
	async findById(
		articleId: string,
		source: string,
		env: Env
	): Promise<NewsArticle | null> {
		try {
			const articleKey = `articles/${source}/${articleId}.json`;
			const object = await env.NEWS_BUCKET.get(articleKey);

			if (!object) {
				return null;
			}

			const text = await object.text();
			return JSON.parse(text) as NewsArticle;
		} catch (error) {
			console.error(
				`[ArticleRepo] Error getting article ${articleId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Get multiple articles by IDs
	 */
	async findMany(articleIds: string[], env: Env): Promise<NewsArticle[]> {
		const articles: NewsArticle[] = [];

		// Fetch articles in parallel
		const articlePromises = articleIds.map(async (id) => {
			// Extract source from ID
			const sourcePrefix = id.split("-")[0];
			const sourceMap: Record<string, string> = {
				wiki: "wikipedia",
				hn: "hackernews",
				t24: "t24",
				eksisozluk: "eksisozluk",
				reddit: "reddit",
				webrazzi: "webrazzi",
				bbc: "bbc",
			};
			const source = sourceMap[sourcePrefix!] || sourcePrefix;
			return this.findById(id, source!, env);
		});

		const results = await Promise.all(articlePromises);

		for (const article of results) {
			if (article) {
				articles.push(article);
			}
		}

		return articles;
	}

	/**
	 * Save a thumbnail to R2
	 */
	async saveThumbnail(
		articleId: string,
		blob: Blob,
		env: Env
	): Promise<string> {
		const extension = blob.type.includes("png") ? "png" : "jpg";
		const thumbnailKey = `thumbnails/${articleId}.${extension}`;

		await env.NEWS_BUCKET.put(thumbnailKey, blob, {
			httpMetadata: {
				contentType: blob.type || "image/png",
				cacheControl: THUMBNAIL_CACHE_CONTROL,
			},
		});

		return `/thumbnails/${articleId}.${extension}`;
	}

	/**
	 * Get a thumbnail from R2
	 */
	async getThumbnail(thumbnailKey: string, env: Env): Promise<Blob | null> {
		try {
			const object = await env.NEWS_BUCKET.get(thumbnailKey);

			if (!object) {
				return null;
			}

			return await object.blob();
		} catch (error) {
			console.error(
				`[ArticleRepo] Error getting thumbnail ${thumbnailKey}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Delete an article and its thumbnail
	 */
	async delete(articleId: string, source: string, env: Env): Promise<void> {
		const articleKey = `articles/${source}/${articleId}.json`;
		await env.NEWS_BUCKET.delete(articleKey);

		// Try to delete both possible thumbnail extensions
		await env.NEWS_BUCKET.delete(`thumbnails/${articleId}.png`);
		await env.NEWS_BUCKET.delete(`thumbnails/${articleId}.jpg`);

		console.log(`[ArticleRepo] Deleted article ${articleId}`);
	}
}

// Export singleton instance
export const articleRepository = new ArticleRepository();
