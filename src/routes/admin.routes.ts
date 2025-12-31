import { Hono } from "hono";
import type { Env, TransformVariant } from "../types";
import { crawlService, articleService, pushService, transformService } from "../services";
import { indexRepository } from "../repositories";
import { adminRateLimit, transformRateLimit, requireAuth } from "../middleware";

const app = new Hono<{ Bindings: Env }>();

// SECURITY: Require authentication for all admin endpoints
// Set ADMIN_API_KEY secret: wrangler secret put ADMIN_API_KEY
// Then use: Authorization: Bearer <your-api-key>
app.use("*", requireAuth);

// Apply rate limiting after authentication
app.use("*", adminRateLimit());

/**
 * POST /api/admin/crawl
 * Manual crawl trigger
 *
 * Options:
 * - sources: Array of source names (default: ["hackernews"])
 * - count: Number of articles per source (default: 5)
 * - transform: Whether to apply AI transformation (default: false)
 * - variant: Transformation variant if transform is true (default: "default")
 * - sync: Wait for completion or run in background (default: true)
 */
app.post("/crawl", async (c) => {
	try {
		const body = await c.req.json<{
			sources?: string[];
			count?: number;
			transform?: boolean;
			variant?: TransformVariant;
			sync?: boolean;
		}>();

		const sources = body.sources || ["hackernews"];
		const count = body.count || 5;
		const transform = body.transform ?? false;
		const variant = body.variant || "default";
		const sync = body.sync ?? true;

		if (sync) {
			// Synchronous processing
			const results = await crawlService.crawlMultiple(sources, count, c.env);

			// Get all crawled articles
			const allArticles = results.flatMap((r) => r.articles);

			// Save raw articles first
			const saved = await articleService.saveRawArticles(allArticles, c.env);

			// Optionally transform
			let transformed = saved;
			if (transform && variant !== "raw") {
				const processedArticles = await articleService.processArticles(
					saved,
					c.env
				);
				transformed = processedArticles;
			}

			// Send push notifications if articles were transformed
			if (transform && transformed.length > 0) {
				c.executionCtx.waitUntil(
					pushService.sendNotifications(transformed, c.env)
				);
			}

			return c.json({
				success: true,
				count: saved.length,
				transformed: transform,
				variant: transform ? variant : "raw",
				status: "completed",
				articles: saved,
				results,
			});
		} else {
			// Asynchronous processing
			c.executionCtx.waitUntil(
				(async () => {
					const results = await crawlService.crawlMultiple(
						sources,
						count,
						c.env
					);
					const allArticles = results.flatMap((r) => r.articles);
					const saved = await articleService.saveRawArticles(allArticles, c.env);

					if (transform && variant !== "raw") {
						await articleService.processArticles(saved, c.env);
					}
				})()
			);

			return c.json({
				success: true,
				status: "processing",
				message: `Crawling ${sources.length} sources in background`,
				transform,
				variant: transform ? variant : "raw",
			});
		}
	} catch (error) {
		console.error("[Admin API] Error in manual crawl:", error);
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
		}>();

		const variant = body.variant || "default";
		const variants = body.variants || [variant];
		const limit = body.limit || 10;

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
				c.env
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
						c.env
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
					c.env
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

export default app;
