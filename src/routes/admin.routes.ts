import { Hono } from "hono";
import type { Env } from "../types";
import { crawlService, articleService, pushService } from "../services";
import { indexRepository } from "../repositories";

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/admin/crawl
 * Manual crawl trigger
 */
app.post("/crawl", async (c) => {
	try {
		const body = await c.req.json<{
			sources?: string[];
			count?: number;
			sync?: boolean;
		}>();

		const sources = body.sources || ["hackernews"];
		const count = body.count || 5;
		const sync = body.sync ?? true;

		if (sync) {
			// Synchronous processing
			const results = await crawlService.crawlMultiple(sources, count, c.env);

			// Process articles
			const allArticles = results.flatMap((r) => r.articles);
			const processed = await articleService.processArticles(
				allArticles,
				c.env
			);

			// Send push notifications
			if (processed.length > 0) {
				c.executionCtx.waitUntil(
					pushService.sendNotifications(processed, c.env)
				);
			}

			return c.json({
				success: true,
				count: processed.length,
				status: "completed",
				articles: processed,
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
					await articleService.processArticles(allArticles, c.env);
				})()
			);

			return c.json({
				success: true,
				status: "processing",
				message: `Crawling ${sources.length} sources in background`,
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

export default app;
