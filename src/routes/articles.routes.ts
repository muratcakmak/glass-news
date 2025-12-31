import { Hono } from "hono";
import type { Env, TransformVariant } from "../types";
import { articleService, transformService } from "../services";
import { DEFAULT_ARTICLE_LIMIT } from "../config/constants";
import { SOURCE_MAP } from "../config/constants";
import { readRateLimit } from "../middleware";

const app = new Hono<{ Bindings: Env }>();

// Apply rate limiting to all article routes
app.use("*", readRateLimit());

/**
 * GET /api/articles
 * List articles with optional filtering
 */
app.get("/", async (c) => {
	const source = c.req.query("source");
	const limit = parseInt(c.req.query("limit") || String(DEFAULT_ARTICLE_LIMIT));

	try {
		const articles = await articleService.listArticles(source, limit, c.env);

		return c.json({
			articles,
			count: articles.length,
		});
	} catch (error) {
		console.error("[Articles API] Error listing articles:", error);
		return c.json({ error: "Failed to list articles" }, 500);
	}
});

/**
 * GET /api/articles/:id
 * Get a single article by ID
 *
 * Query parameters:
 * - variant: Specific variant to retrieve (raw | default | technical | casual | formal | brief)
 */
app.get("/:id", async (c) => {
	const articleId = c.req.param("id");
	const variant = (c.req.query("variant") || "raw") as TransformVariant;

	if (!articleId) {
		return c.json({ error: "Article ID required" }, 400);
	}

	try {
		// Extract source from article ID
		const sourcePrefix = articleId.split("-")[0];
		const source = SOURCE_MAP[sourcePrefix!] || sourcePrefix;

		const article = await articleService.getArticle(articleId, source!, c.env);

		if (!article) {
			return c.json({ error: "Article not found" }, 404);
		}

		// If raw variant or no transformation requested, return original
		if (variant === "raw") {
			return c.json(article);
		}

		// Get or create the requested variant
		const articleVariant = await transformService.getOrCreateVariant(
			article,
			variant,
			c.env
		);

		return c.json(articleVariant);
	} catch (error) {
		console.error("[Articles API] Error getting article:", error);
		return c.json({ error: "Failed to get article" }, 500);
	}
});

/**
 * GET /api/articles/:id/variants
 * List all available variants for an article
 */
app.get("/:id/variants", async (c) => {
	const articleId = c.req.param("id");

	if (!articleId) {
		return c.json({ error: "Article ID required" }, 400);
	}

	try {
		const sourcePrefix = articleId.split("-")[0];
		const source = SOURCE_MAP[sourcePrefix!] || sourcePrefix;

		const variants = await transformService.listAvailableVariants(
			articleId,
			source!,
			c.env
		);

		return c.json({
			articleId,
			variants,
			count: variants.length,
		});
	} catch (error) {
		console.error("[Articles API] Error listing variants:", error);
		return c.json({ error: "Failed to list variants" }, 500);
	}
});

/**
 * GET /api/articles/:id/variants/:variant
 * Get a specific variant of an article
 */
app.get("/:id/variants/:variant", async (c) => {
	const articleId = c.req.param("id");
	const variant = c.req.param("variant") as TransformVariant;

	if (!articleId || !variant) {
		return c.json({ error: "Article ID and variant required" }, 400);
	}

	try {
		const sourcePrefix = articleId.split("-")[0];
		const source = SOURCE_MAP[sourcePrefix!] || sourcePrefix;

		const article = await articleService.getArticle(articleId, source!, c.env);

		if (!article) {
			return c.json({ error: "Article not found" }, 404);
		}

		const articleVariant = await transformService.getOrCreateVariant(
			article,
			variant,
			c.env
		);

		return c.json(articleVariant);
	} catch (error) {
		console.error("[Articles API] Error getting variant:", error);
		return c.json({ error: "Failed to get variant" }, 500);
	}
});

export default app;
