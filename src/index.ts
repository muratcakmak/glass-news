import { Env, NewsArticle } from "./types";
import { crawlT24, fetchT24ArticleDetail } from "./crawlers/t24";
import { crawlEksisozluk, fetchEksisozlukDetail } from "./crawlers/eksisozluk";
import { crawlHackerNews } from "./crawlers/hackernews";
import { crawlWikipedia } from "./crawlers/wikipedia";
import { crawlReddit } from "./crawlers/reddit";
import { transformContent } from "./transformers/content";
import { generateThumbnail } from "./transformers/thumbnail";
import {
	saveArticleToR2,
	listArticles,
	getArticleFromR2,
} from "./utils/storage";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// CORS headers for API access
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// API Routes
		if (url.pathname === "/api/articles") {
			return handleGetArticles(url, env, corsHeaders);
		}

		if (url.pathname.startsWith("/api/article/")) {
			return handleGetArticle(url, env, corsHeaders);
		}

		if (url.pathname.startsWith("/thumbnails/")) {
			return handleGetThumbnail(url, env);
		}

		if (url.pathname === "/api/crawl" && request.method === "POST") {
			// Manual trigger for testing
			return handleManualCrawl(request, env, ctx, corsHeaders);
		}

		if (url.pathname === "/api/clean" && request.method === "POST") {
			// Clean KV store and optionally R2 bucket
			return handleCleanStorage(env, corsHeaders);
		}

		// Isolated Image Gen Test Route
		if (url.pathname === "/test-gen") {
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
				const imageBlob = await generateThumbnail(mockArticle, env);

				if (imageBlob) {
					return new Response(imageBlob, {
						headers: {
							"Content-Type": imageBlob.type,
							"X-Generated-Size": imageBlob.size.toString(),
						},
					});
				} else {
					return new Response("Generation returned null (check logs)", {
						status: 500,
					});
				}
			} catch (e: any) {
				return new Response("Generation failed: " + e.toString(), {
					status: 500,
				});
			}
		}

		// Health check
		if (url.pathname === "/health") {
			return new Response(
				JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			);
		}

		return new Response("Not Found", { status: 404 });
	},

	async scheduled(
		event: ScheduledEvent,
		env: Env,
		ctx: ExecutionContext,
	): Promise<void> {
		console.log(
			"Cron triggered at:",
			new Date(event.scheduledTime).toISOString(),
		);

		// Determine which sources to crawl based on time
		const hour = new Date(event.scheduledTime).getUTCHours();
		const shouldCrawlTurkish = hour >= 6 && hour <= 15;
		const shouldCrawlEnglish =
			(hour >= 17 && hour <= 23) || (hour >= 0 && hour <= 2);

		const allArticles: NewsArticle[] = [];

		try {
			// ONLY CRAWL EKSISOZLUK FOR NOW
			console.log("Crawling eksisozluk...");
			const eksiArticles = await crawlEksisozluk(env);

			// Fetch content using SERPER for each article
			console.log(
				`Fetching content for ${eksiArticles.length} eksisozluk articles...`,
			);
			for (const article of eksiArticles) {
				if (!article.originalContent) {
					console.log(`[Eksi] Fetching: ${article.originalUrl}`);
					article.originalContent = await fetchEksisozlukDetail(
						article.originalUrl,
						env,
						article.originalTitle,
					);
					// If content fetching fails, use title as fallback
					if (!article.originalContent) {
						article.originalContent = article.originalTitle;
						console.warn(
							`[Eksi] Using title as content fallback for ${article.id}`,
						);
					}
				}
			}

			allArticles.push(...eksiArticles);
			console.log(`Crawled ${eksiArticles.length} eksisozluk articles`);

			// TODO: Re-enable other sources later
			// if (shouldCrawlEnglish) {
			// 	console.log("Crawling English sources...");
			// 	const [hnArticles, wikiArticles, redditArticles] = await Promise.all([
			// 		crawlHackerNews(),
			// 		crawlWikipedia(),
			// 		crawlReddit(env),
			// 	]);
			// 	allArticles.push(...hnArticles, ...wikiArticles, ...redditArticles);
			// }

			if (allArticles.length === 0) {
				console.log("No articles to process at this time");
				return;
			}

			// Transform and save articles
			console.log(`Processing ${allArticles.length} articles...`);

			for (const article of allArticles) {
				try {
					const transformed = await transformContent(article, env);
					await saveArticleToR2(transformed, env);
				} catch (error) {
					console.error(`Error processing article ${article.id}:`, error);
				}
			}

			console.log(`Successfully processed ${allArticles.length} articles`);
		} catch (error) {
			console.error("Error in scheduled task:", error);
		}
	},
};

async function handleGetArticles(
	url: URL,
	env: Env,
	corsHeaders: Record<string, string>,
): Promise<Response> {
	const source = url.searchParams.get("source") as NewsArticle["source"] | null;
	const limit = parseInt(url.searchParams.get("limit") || "20");

	try {
		const articles = await listArticles(source, limit, env);

		return new Response(JSON.stringify({ articles, count: articles.length }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error getting articles:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
}

async function handleGetArticle(
	url: URL,
	env: Env,
	corsHeaders: Record<string, string>,
): Promise<Response> {
	const pathParts = url.pathname.split("/");
	const articleId = pathParts[pathParts.length - 1];

	if (!articleId) {
		return new Response(JSON.stringify({ error: "Article ID required" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	try {
		// Extract source from article ID
		const source = articleId.split("-")[0] as NewsArticle["source"];
		const article = await getArticleFromR2(articleId, source, env);

		if (!article) {
			return new Response(JSON.stringify({ error: "Article not found" }), {
				status: 404,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify(article), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error getting article:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
}

async function handleGetThumbnail(url: URL, env: Env): Promise<Response> {
	const thumbnailKey = url.pathname.substring(1); // Remove leading slash

	try {
		const object = await env.NEWS_BUCKET.get(thumbnailKey);

		if (!object) {
			return new Response("Thumbnail not found", { status: 404 });
		}

		return new Response(object.body, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "public, max-age=31536000",
			},
		});
	} catch (error) {
		console.error("Error getting thumbnail:", error);
		return new Response("Internal server error", { status: 500 });
	}
}

async function handleManualCrawl(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>,
): Promise<Response> {
	try {
		const body = (await request.json()) as { sources?: string[] };
		const sources = body.sources || ["all"];

		const allArticles: NewsArticle[] = [];

		// ONLY EKSISOZLUK FOR NOW
		console.log("Crawling Eksisozluk...");
		const eksiArticles = await crawlEksisozluk(env);

		// Fetch content using SERPER for each article
		console.log(
			`Fetching content for ${eksiArticles.length} eksisozluk articles...`,
		);
		for (const article of eksiArticles) {
			if (!article.originalContent) {
				console.log(`[Eksi] Fetching: ${article.originalUrl}`);
				article.originalContent = await fetchEksisozlukDetail(
					article.originalUrl,
					env,
					article.originalTitle,
				);
				// If content fetching fails, use title as fallback
				if (!article.originalContent) {
					article.originalContent = article.originalTitle;
					console.warn(
						`[Eksi] Using title as content fallback for ${article.id}`,
					);
				}
			}
		}

		allArticles.push(...eksiArticles);
		console.log(`Crawled ${eksiArticles.length} eksisozluk articles`);

		// TODO: Re-enable other sources later
		// if (sources.includes("hackernews")) {
		// 	const hnArticles = await crawlHackerNews();
		// 	allArticles.push(...hnArticles);
		// }
		// if (sources.includes("wikipedia")) {
		// 	const wikiArticles = await crawlWikipedia();
		// 	allArticles.push(...wikiArticles);
		// }
		// if (sources.includes("reddit")) {
		// 	const redditArticles = await crawlReddit(env);
		// 	allArticles.push(...redditArticles);
		// }

		// Process articles in background to avoid timeout
		ctx.waitUntil(
			(async () => {
				try {
					// Process articles one at a time to avoid timeout
					let processedCount = 0;
					for (const article of allArticles) {
						try {
							// Transform and save immediately
							const transformed = await transformContent(article, env);
							await saveArticleToR2(transformed, env);
							processedCount++;
						} catch (error) {
							console.error(`Error processing article ${article.id}:`, error);
							// Save without transformation on error
							await saveArticleToR2(article, env);
							processedCount++;
						}
					}
					console.log(`Successfully processed ${processedCount} articles`);
				} catch (error) {
					console.error("Error processing articles in background:", error);
				}
			})(),
		);

		// Return immediately with crawled count
		return new Response(
			JSON.stringify({
				success: true,
				count: allArticles.length,
				status: "processing",
			}),
			{ headers: { ...corsHeaders, "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Error in manual crawl:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
}

async function handleCleanStorage(
	env: Env,
	corsHeaders: Record<string, string>,
): Promise<Response> {
	try {
		console.log("Cleaning KV store...");

		// Clean all KV indexes
		const sources = ["hackernews", "wikipedia", "reddit", "eksisozluk", "t24"];
		const keysToDelete: string[] = ["index:all"];

		for (const source of sources) {
			keysToDelete.push(`index:${source}`);
		}

		console.log(`Deleting ${keysToDelete.length} KV keys:`, keysToDelete);

		for (const key of keysToDelete) {
			await env.NEWS_KV.delete(key);
			console.log(`✓ Deleted ${key}`);
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: "KV store cleaned successfully",
				deletedKeys: keysToDelete,
			}),
			{ headers: { ...corsHeaders, "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Error cleaning storage:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
}
