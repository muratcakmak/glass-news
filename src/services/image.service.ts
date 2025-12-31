import type { Env, NewsArticle } from "../types";
import { generateThumbnail } from "../transformers/thumbnail";
import { THUMBNAIL_CACHE_CONTROL } from "../config/constants";

/**
 * Service for image generation operations
 * Handles thumbnail generation and storage separately from text transformation
 *
 * Free tier options (when ENABLE_AI_IMAGES=false):
 * - Unsplash API: High-quality curated photos (50 req/hour)
 * - DiceBear: Pattern-based avatars (unlimited)
 * - UI Avatars: Initial-based avatars (unlimited)
 * - Lorem Picsum: Random photos (unlimited)
 */
export class ImageService {
	/**
	 * Check if AI image generation is enabled
	 */
	private isAIImagesEnabled(env: Env): boolean {
		return env.ENABLE_AI_IMAGES === "true";
	}

	/**
	 * Generate URL for Unsplash image (Free tier: 50 requests/hour)
	 * Returns direct URL, no download needed
	 */
	private async getUnsplashImageUrl(
		article: NewsArticle,
		env: Env
	): Promise<string | null> {
		if (!env.UNSPLASH_API_KEY) {
			console.log(`[ImageService] No UNSPLASH_API_KEY configured`);
			return null;
		}

		try {
			const title = article.transformedTitle || article.originalTitle;
			// Extract keywords for better image matching
			const keywords = title
				.toLowerCase()
				.split(" ")
				.filter(word => word.length > 4)
				.slice(0, 3)
				.join(",");

			const query = keywords || "technology,news";

			console.log(`[ImageService] Fetching from Unsplash with query: ${query}`);

			const response = await fetch(
				`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
				{
					headers: {
						Authorization: `Client-ID ${env.UNSPLASH_API_KEY}`,
					},
				}
			);

			if (!response.ok) {
				console.error(`[ImageService] Unsplash API error: ${response.status}`);
				return null;
			}

			const data = await response.json();
			const imageUrl = data.urls?.regular || data.urls?.small;

			if (!imageUrl) {
				console.error(`[ImageService] No image URL in Unsplash response`);
				return null;
			}

			return imageUrl;
		} catch (error) {
			console.error(`[ImageService] Unsplash error:`, error);
			return null;
		}
	}

	/**
	 * Generate URL for DiceBear image (Free, unlimited)
	 * Returns direct CDN URL, no download needed
	 */
	private getDicebearImageUrl(article: NewsArticle): string {
		const seed = encodeURIComponent(article.id);
		// Use modern, aesthetic styles
		const styles = ["shapes", "rings", "pixel-art", "identicon", "thumbs"];
		const styleIndex = Math.abs(this.hashCode(article.id)) % styles.length;

		const imageUrl = `https://api.dicebear.com/7.x/${styles[styleIndex]}/png?seed=${seed}&size=512&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

		console.log(`[ImageService] Using DiceBear: ${styles[styleIndex]}`);
		return imageUrl;
	}

	/**
	 * Generate URL for Lorem Picsum image (Free, unlimited)
	 * Returns direct URL, no download needed
	 */
	private getLoremPicsumImageUrl(): string {
		const imageId = Math.floor(Math.random() * 1000);
		const imageUrl = `https://picsum.photos/seed/${imageId}/800/600`;

		console.log(`[ImageService] Using Lorem Picsum`);
		return imageUrl;
	}

	/**
	 * Hash string to number for consistent randomness
	 */
	private hashCode(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		return hash;
	}

	/**
	 * Generate image for a single article
	 * Two separate flows:
	 * 1. AI images: Generate blob, upload to R2, return R2 URL
	 * 2. Free services: Just return direct CDN URL (no download/upload)
	 */
	async generateArticleImage(
		article: NewsArticle,
		env: Env
	): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
		console.log(`[ImageService] Generating image for ${article.id}...`);
		console.log(`[ImageService] AI Images enabled: ${this.isAIImagesEnabled(env)}`);

		try {
			// Flow 1: AI image generation (needs R2 storage)
			if (this.isAIImagesEnabled(env)) {
				console.log(`[ImageService] Using AI image generation (Gemini) - will upload to R2`);

				const aiBlob = await generateThumbnail(article, env);

				if (aiBlob) {
					// Upload AI-generated image to R2
					const extension = aiBlob.type.includes("png") ? "png" : "jpg";
					const thumbnailKey = `thumbnails/${article.id}.${extension}`;

					console.log(
						`[ImageService] Uploading AI image: ${thumbnailKey} (${aiBlob.size} bytes)`
					);

					await env.NEWS_BUCKET.put(thumbnailKey, aiBlob, {
						httpMetadata: {
							contentType: aiBlob.type,
							cacheControl: THUMBNAIL_CACHE_CONTROL,
						},
					});

					const thumbnailUrl = `https://news-data.omc345.workers.dev/${thumbnailKey}`;

					console.log(`[ImageService] ✓ AI image uploaded for ${article.id}: ${thumbnailUrl}`);

					return {
						success: true,
						thumbnailUrl,
					};
				}

				console.warn(`[ImageService] AI image generation failed, falling back to free services`);
			}

			// Flow 2: Free services (just return URL, no storage needed)
			console.log(`[ImageService] Using free image services (direct URLs)`);

			let imageUrl: string | null = null;

			// Try Unsplash first (best quality, but rate limited)
			if (env.UNSPLASH_API_KEY && !imageUrl) {
				imageUrl = await this.getUnsplashImageUrl(article, env);
			}

			// Fallback to DiceBear (unlimited, always works)
			if (!imageUrl) {
				imageUrl = this.getDicebearImageUrl(article);
			}

			// Last resort: Lorem Picsum (should never reach here since DiceBear always works)
			if (!imageUrl) {
				imageUrl = this.getLoremPicsumImageUrl();
			}

			console.log(`[ImageService] ✓ Using free service URL for ${article.id}: ${imageUrl}`);

			return {
				success: true,
				thumbnailUrl: imageUrl,
			};
		} catch (error) {
			console.error(
				`[ImageService] Error generating image for ${article.id}:`,
				error
			);

			// Emergency fallback: Always return DiceBear URL
			const fallbackUrl = this.getDicebearImageUrl(article);
			console.log(`[ImageService] Emergency fallback to DiceBear: ${fallbackUrl}`);

			return {
				success: true,
				thumbnailUrl: fallbackUrl,
			};
		}
	}

	/**
	 * Generate images for multiple articles in batch
	 */
	async generateBatchImages(
		articles: NewsArticle[],
		env: Env
	): Promise<Array<{ articleId: string; success: boolean; thumbnailUrl?: string; error?: string }>> {
		console.log(`[ImageService] Generating images for ${articles.length} articles...`);

		const results = [];

		// Process in batches to avoid overwhelming the API
		const batchSize = 3;
		for (let i = 0; i < articles.length; i += batchSize) {
			const batch = articles.slice(i, i + batchSize);

			const batchResults = await Promise.all(
				batch.map(async (article) => {
					const result = await this.generateArticleImage(article, env);
					return {
						articleId: article.id,
						...result,
					};
				})
			);

			results.push(...batchResults);

			// Small delay between batches
			if (i + batchSize < articles.length) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
		}

		const successCount = results.filter((r) => r.success).length;
		console.log(
			`[ImageService] ✓ Generated ${successCount}/${articles.length} images`
		);

		return results;
	}

	/**
	 * Check if thumbnail exists for an article
	 */
	async hasThumbnail(articleId: string, env: Env): Promise<boolean> {
		try {
			const pngKey = `thumbnails/${articleId}.png`;
			const jpgKey = `thumbnails/${articleId}.jpg`;

			const [pngExists, jpgExists] = await Promise.all([
				env.NEWS_BUCKET.head(pngKey),
				env.NEWS_BUCKET.head(jpgKey),
			]);

			return !!(pngExists || jpgExists);
		} catch (error) {
			return false;
		}
	}

	/**
	 * Delete thumbnail for an article
	 */
	async deleteThumbnail(articleId: string, env: Env): Promise<void> {
		console.log(`[ImageService] Deleting thumbnail for ${articleId}...`);

		try {
			const pngKey = `thumbnails/${articleId}.png`;
			const jpgKey = `thumbnails/${articleId}.jpg`;

			await Promise.all([
				env.NEWS_BUCKET.delete(pngKey),
				env.NEWS_BUCKET.delete(jpgKey),
			]);

			console.log(`[ImageService] ✓ Deleted thumbnail for ${articleId}`);
		} catch (error) {
			console.error(
				`[ImageService] Error deleting thumbnail for ${articleId}:`,
				error
			);
			throw error;
		}
	}
}

// Export singleton instance
export const imageService = new ImageService();
