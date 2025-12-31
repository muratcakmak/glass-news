import { Hono } from "hono";
import type { Env, TransformVariant } from "../types";
import { crawlService, articleService, pushService, transformService, imageService } from "../services";
import { indexRepository } from "../repositories";
import { adminRateLimit, transformRateLimit, requireAuth } from "../middleware";
import { transformContent } from "../transformers/content";

const app = new Hono<{ Bindings: Env }>();

// SECURITY: Require authentication for all admin endpoints
// Set ADMIN_API_KEY secret: wrangler secret put ADMIN_API_KEY
// Then use: Authorization: Bearer <your-api-key>
app.use("*", requireAuth);

// Apply rate limiting after authentication
app.use("*", adminRateLimit());

/**
 * POST /api/admin/process
 * Full orchestration: Crawl → Transform → Generate Images → Update KV
 *
 * This is the main endpoint for production workflows.
 * Ensures KV is updated with processed articles.
 *
 * Options:
 * - sources: Array of source names (default: ["hackernews"])
 * - count: Number of articles per source (default: 5)
 * - transform: Whether to apply AI text transformation (default: true)
 * - generateImage: Whether to generate images (default: true)
 * - style: Writing style for transformation (pamuk | direct | greentext | random)
 */
app.post("/process", async (c) => {
	try {
		const body = await c.req.json<{
			sources?: string[];
			count?: number;
			transform?: boolean;
			generateImage?: boolean;
			style?: "pamuk" | "direct" | "greentext" | "random";
		}>();

		const sources = body.sources || ["hackernews"];
		const count = body.count || 5;
		const transform = body.transform ?? true;
		const generateImage = body.generateImage ?? true;
		const style = body.style;

		// Step 1: Crawl articles
		console.log(`[Process] Step 1: Crawling ${sources.join(", ")}`);
		const crawlResults = await crawlService.crawlMultiple(sources, count, c.env);
		const allArticles = crawlResults.flatMap((r) => r.articles);
		const crawled = await articleService.saveRawArticles(allArticles, c.env);

		// Step 2: Transform if requested
		let processed = crawled;
		if (transform) {
			console.log(`[Process] Step 2: Transforming ${crawled.length} articles with style: ${style || 'default'}`);

			// Transform each article with the specified style (directly, not using variant system)
			const transformPromises = crawled.map(async (article) => {
				try {
					const transformed = await transformContent(article, c.env, { style });
					return transformed;
				} catch (error) {
					console.error(`[Process] Error transforming ${article.id}:`, error);
					return article;
				}
			});

			processed = await Promise.all(transformPromises);

			// Re-save with transformed content
			await articleService.saveRawArticles(processed, c.env);
		}

		// Step 3: Generate images if requested
		if (generateImage) {
			console.log(`[Process] Step 3: Generating images for ${processed.length} articles`);
			const imageResults = await imageService.generateBatchImages(processed, c.env);

			// Update articles with thumbnail URLs
			processed = processed.map(article => {
				const imageResult = imageResults.find(r => r.articleId === article.id);
				if (imageResult?.thumbnailUrl) {
					return { ...article, thumbnailUrl: imageResult.thumbnailUrl };
				}
				return article;
			});

			// Re-save with thumbnailUrl
			await articleService.saveRawArticles(processed, c.env);
		}

		// Step 4: KV is already updated by saveRawArticles (updates index)
		console.log(`[Process] ✓ Completed: ${processed.length} articles processed and indexed in KV`);

		return c.json({
			success: true,
			count: processed.length,
			transformed: transform,
			imagesGenerated: generateImage,
			style: style || "default",
			articles: processed,
			results: crawlResults,
		});
	} catch (error) {
		console.error("[Admin API] Error in process:", error);
		return c.json({ error: "Failed to process articles" }, 500);
	}
});

/**
 * POST /api/admin/crawl
 * Crawl articles from sources and save them
 *
 * SINGLE RESPONSIBILITY: Just crawl and save raw articles
 * Use /api/admin/transform and /api/admin/generate-image for processing
 *
 * Options:
 * - sources: Array of source names (default: ["hackernews"])
 * - count: Number of articles per source (default: 5)
 */
app.post("/crawl", async (c) => {
	try {
		const body = await c.req.json<{
			sources?: string[];
			count?: number;
		}>();

		const sources = body.sources || ["hackernews"];
		const count = body.count || 5;

		// Crawl articles
		const results = await crawlService.crawlMultiple(sources, count, c.env);

		// Get all crawled articles
		const allArticles = results.flatMap((r) => r.articles);

		// Save raw articles
		const saved = await articleService.saveRawArticles(allArticles, c.env);

		return c.json({
			success: true,
			count: saved.length,
			articles: saved,
			results,
		});
	} catch (error) {
		console.error("[Admin API] Error in crawl:", error);
		return c.json({ error: "Failed to crawl" }, 500);
	}
});

/**
 * POST /api/admin/clean
 * Clean KV indexes
 */
app.post("/clean", async (c) => {
	try {
		const deletedKeys = await indexRepository.clearAll(c.env);

		return c.json({
			success: true,
			message: "KV store cleaned successfully",
			deletedKeys,
		});
	} catch (error) {
		console.error("[Admin API] Error cleaning storage:", error);
		return c.json({ error: "Failed to clean storage" }, 500);
	}
});

/**
 * GET /api/admin/providers
 * List all providers
 */
app.get("/providers", async (c) => {
	try {
		const allProviders = crawlService.listProviders();
		const enabledProviders = crawlService.listEnabledProviders(c.env);

		return c.json({
			all: allProviders,
			enabled: enabledProviders,
		});
	} catch (error) {
		console.error("[Admin API] Error listing providers:", error);
		return c.json({ error: "Failed to list providers" }, 500);
	}
});

/**
 * POST /api/admin/transform
 * Transform existing articles with specific variant styles
 *
 * Options:
 * - articleId: Single article ID to transform
 * - articleIds: Array of article IDs to transform
 * - source: Source to batch transform (with limit)
 * - limit: Number of articles to transform when using source (default: 10)
 * - variant: Transformation variant (default | technical | casual | formal | brief)
 * - variants: Array of variants to generate multiple transformations
 * - style: Writing style (pamuk | direct | greentext | random)
 */
app.post("/transform", transformRateLimit(), async (c) => {
	try {
		const body = await c.req.json<{
			articleId?: string;
			articleIds?: string[];
			source?: string;
			limit?: number;
			variant?: Exclude<TransformVariant, "raw">;
			variants?: Exclude<TransformVariant, "raw">[];
			style?: "pamuk" | "direct" | "greentext" | "random";
		}>();

		const variant = body.variant || "default";
		const variants = body.variants || [variant];
		const limit = body.limit || 10;
		const style = body.style;

		// Case 1: Single article transformation
		if (body.articleId) {
			const sourcePrefix = body.articleId.split("-")[0];
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

			const article = await articleService.getArticle(body.articleId, source!, c.env);
			if (!article) {
				return c.json({ error: "Article not found" }, 404);
			}

			const transformed = await transformService.transformMultipleVariants(
				article,
				variants,
				c.env,
				style
			);

			return c.json({
				success: true,
				articleId: body.articleId,
				variants: transformed,
			});
		}

		// Case 2: Multiple specific articles
		if (body.articleIds && body.articleIds.length > 0) {
			const results = [];

			for (const articleId of body.articleIds) {
				const sourcePrefix = articleId.split("-")[0];
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

				const article = await articleService.getArticle(articleId, source!, c.env);
				if (article) {
					const transformed = await transformService.transformMultipleVariants(
						article,
						variants,
						c.env,
						style
					);
					results.push({ articleId, variants: transformed });
				}
			}

			return c.json({
				success: true,
				count: results.length,
				results,
			});
		}

		// Case 3: Batch transform by source
		if (body.source) {
			const articles = await articleService.listArticles(body.source, limit, c.env);
			const results = [];

			for (const article of articles) {
				const transformed = await transformService.transformMultipleVariants(
					article,
					variants,
					c.env,
					style
				);
				results.push({ articleId: article.id, variants: transformed });
			}

			return c.json({
				success: true,
				source: body.source,
				count: results.length,
				results,
			});
		}

		return c.json({ error: "Must provide articleId, articleIds, or source" }, 400);
	} catch (error) {
		console.error("[Admin API] Error in transform:", error);
		return c.json({ error: "Failed to transform" }, 500);
	}
});

/**
 * POST /api/admin/generate-image
 * Generate images (thumbnails) for articles
 *
 * Options:
 * - articleId: Single article ID to generate image for
 * - articleIds: Array of article IDs to generate images for
 * - source: Source to batch generate images (with limit)
 * - limit: Number of articles to process when using source (default: 10)
 */
app.post("/generate-image", transformRateLimit(), async (c) => {
	try {
		const body = await c.req.json<{
			articleId?: string;
			articleIds?: string[];
			source?: string;
			limit?: number;
		}>();

		const limit = body.limit || 10;

		// Case 1: Single article image generation
		if (body.articleId) {
			const sourcePrefix = body.articleId.split("-")[0];
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

			const article = await articleService.getArticle(body.articleId, source!, c.env);
			if (!article) {
				return c.json({ error: "Article not found" }, 404);
			}

			const result = await imageService.generateArticleImage(article, c.env);

			return c.json({
				success: result.success,
				articleId: body.articleId,
				thumbnailUrl: result.thumbnailUrl,
				error: result.error,
			});
		}

		// Case 2: Multiple specific articles
		if (body.articleIds && body.articleIds.length > 0) {
			const articles = [];

			for (const articleId of body.articleIds) {
				const sourcePrefix = articleId.split("-")[0];
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

				const article = await articleService.getArticle(articleId, source!, c.env);
				if (article) {
					articles.push(article);
				}
			}

			const results = await imageService.generateBatchImages(articles, c.env);

			return c.json({
				success: true,
				count: results.length,
				results,
			});
		}

		// Case 3: Batch generate by source
		if (body.source) {
			const articles = await articleService.listArticles(body.source, limit, c.env);
			const results = await imageService.generateBatchImages(articles, c.env);

			return c.json({
				success: true,
				source: body.source,
				count: results.length,
				results,
			});
		}

		return c.json({ error: "Must provide articleId, articleIds, or source" }, 400);
	} catch (error) {
		console.error("[Admin API] Error in generate-image:", error);
		return c.json({ error: "Failed to generate image" }, 500);
	}
});

export default app;
