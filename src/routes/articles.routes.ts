import { Hono } from "hono";
import type { Env } from "../types";
import { articleService } from "../services";
import { DEFAULT_ARTICLE_LIMIT } from "../config/constants";
import { SOURCE_MAP } from "../config/constants";

const app = new Hono<{ Bindings: Env }>();

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
 */
app.get("/:id", async (c) => {
	const articleId = c.req.param("id");

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

		return c.json(article);
	} catch (error) {
		console.error("[Articles API] Error getting article:", error);
		return c.json({ error: "Failed to get article" }, 500);
	}
});

export default app;
