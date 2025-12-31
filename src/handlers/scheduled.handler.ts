import type { Env } from "../types";
import { crawlService, articleService, pushService } from "../services";

/**
 * Scheduled handler for cron jobs
 * Runs every 4 hours to crawl news sources
 */
export async function scheduledHandler(
	event: ScheduledEvent,
	env: Env,
	ctx: ExecutionContext
): Promise<void> {
	console.log(
		"[Scheduled] Cron triggered at:",
		new Date(event.scheduledTime).toISOString()
	);

	try {
		// Crawl specific sources with limits
		const sources = ["hackernews", "t24", "eksisozluk"];
		const limit = 1; // Limit per source

		console.log(`[Scheduled] Crawling sources: ${sources.join(", ")}`);

		const results = await crawlService.crawlMultiple(sources, limit, env);

		// Collect all articles
		const allArticles = results.flatMap((r) => r.articles);

		console.log(`[Scheduled] Collected ${allArticles.length} total articles`);

		if (allArticles.length === 0) {
			console.log("[Scheduled] No articles to process");
			return;
		}

		// Process articles
		const processed = await articleService.processArticles(allArticles, env);

		console.log(
			`[Scheduled] Successfully processed ${processed.length}/${allArticles.length} articles`
		);

		// Send push notifications in background
		if (processed.length > 0) {
			console.log(`[Scheduled] Queueing push notifications...`);
			ctx.waitUntil(pushService.sendNotifications(processed, env));
		}
	} catch (error) {
		console.error("[Scheduled] Error in scheduled task:", error);
	}
}
