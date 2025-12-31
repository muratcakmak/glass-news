import { fromHono } from "chanfana";
import { Hono } from "hono";
import type { Env } from "./types";
import { registerAllProviders } from "./providers";
import { corsMiddleware, errorHandler, requestLogger } from "./middleware";
import { scheduledHandler } from "./handlers/scheduled.handler";

// Import routes
import articlesRoutes from "./routes/articles.routes";
import subscriptionsRoutes from "./routes/subscriptions.routes";
import adminRoutes from "./routes/admin.routes";
import assetsRoutes from "./routes/assets.routes";

// Register all news providers
registerAllProviders();

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", requestLogger);
app.use("*", corsMiddleware);
app.use("*", errorHandler);

// Mount routes
app.route("/api/articles", articlesRoutes);
app.route("/api/subscriptions", subscriptionsRoutes);
app.route("/api/admin", adminRoutes);
app.route("/", assetsRoutes);

// Legacy routes for backward compatibility
app.get("/api/subscribe", (c) => c.redirect("/api/subscriptions", 301));
app.post("/api/subscribe", (c) => c.redirect("/api/subscriptions", 307));
app.get("/api/article/:id", (c) => c.redirect(`/api/articles/${c.req.param("id")}`, 301));
app.post("/api/crawl", (c) => c.redirect("/api/admin/crawl", 307));
app.post("/api/clean", (c) => c.redirect("/api/admin/clean", 307));
app.post("/api/test-push", (c) => c.redirect("/api/subscriptions/test", 307));
app.get("/api/debug-subs", (c) => c.redirect("/api/subscriptions/count", 301));

// Add OpenAPI documentation with chanfana
const openapi = fromHono(app, {
	docs_url: "/docs",
	redoc_url: "/redoc",
	openapi_url: "/openapi.json",
	schema: {
		info: {
			title: "News Data API",
			version: "3.0.0",
			description: "Modular news aggregation API with AI-powered article transformation variants",
		},
		servers: [
			{
				url: "https://news-data.omc345.workers.dev",
				description: "Production server",
			},
		],
	},
});

export default {
	fetch: openapi.fetch,
	scheduled: scheduledHandler,
};
