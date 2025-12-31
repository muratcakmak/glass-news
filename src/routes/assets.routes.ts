import { Hono } from "hono";
import type { Env } from "../types";
import { generateThumbnail } from "../transformers/thumbnail";
import type { NewsArticle } from "../types";

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /thumbnails/:filename
 * Serve thumbnail images
 */
app.get("/thumbnails/*", async (c) => {
	const path = c.req.path;
	const thumbnailKey = path.substring(1); // Remove leading slash

	try {
		const object = await c.env.NEWS_BUCKET.get(thumbnailKey);

		if (!object) {
			return c.text("Thumbnail not found", 404);
		}

		return new Response(object.body, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "public, max-age=31536000",
			},
		});
	} catch (error) {
		console.error("[Assets] Error getting thumbnail:", error);
		return c.text("Internal server error", 500);
	}
});

/**
 * GET /test-gen
 * Test thumbnail generation
 */
app.get("/test-gen", async (c) => {
	const mockArticle: NewsArticle = {
		id: "test-isolation-" + Date.now(),
		source: "hackernews",
		originalTitle: "Apple Reveals New Glass Technology",
		originalContent:
			"Apple has announced a new type of liquid glass that is both durable and flexible.",
		originalUrl: "https://example.com",
		crawledAt: new Date().toISOString(),
		language: "en",
	};

	try {
		console.log("Testing generation for:", mockArticle.id);
		const imageBlob = await generateThumbnail(mockArticle, c.env);

		if (imageBlob) {
			return new Response(imageBlob, {
				headers: {
					"Content-Type": imageBlob.type,
					"X-Generated-Size": imageBlob.size.toString(),
				},
			});
		} else {
			return c.text("Generation returned null (check logs)", 500);
		}
	} catch (e: any) {
		return c.text("Generation failed: " + e.toString(), 500);
	}
});

/**
 * GET /health
 * Health check endpoint
 */
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
	});
});

export default app;
