import type { Env, NewsArticle } from "./types";
import { crawlT24, fetchT24ArticleDetail } from "./crawlers/t24";
import { crawlEksisozluk, fetchEksisozlukDetail } from "./crawlers/eksisozluk";
import { crawlHackerNews, fetchHNArticleContent } from "./crawlers/hackernews";
import { crawlWikipedia } from "./crawlers/wikipedia";
import { crawlReddit } from "./crawlers/reddit";
import { transformContent } from "./transformers/content";
import { generateThumbnail } from "./transformers/thumbnail";
import {
	saveArticleToR2,
	listArticles,
	getArticleFromR2,
} from "./utils/storage";
import webpush from "web-push";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// VAPID Configuration
		webpush.setVapidDetails(
			env.VAPID_SUBJECT,
			"BIxjCPXkLoit-hiaK21vupJXRhxqaksULZ6l-hheRdLLwLPcveNMYKizT64rKbqzZdRxSKcI3QXvSAR8dXmcpTM",
			env.VAPID_PRIVATE_KEY,
		);

		// CORS headers for API access
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// API Routes
		if (url.pathname === "/api/subscribe" && request.method === "POST") {
			return handleSubscribe(request, env, corsHeaders);
		}

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

		if (url.pathname === "/api/test-push" && request.method === "POST") {
			return handleTestPush(request, env, corsHeaders);
		}

		if (url.pathname === "/api/debug-subs") {
			const { keys } = await env.NEWS_KV.list({ prefix: "sub:" });
			return new Response(JSON.stringify({ count: keys.length }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
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

		const allArticles: NewsArticle[] = [];

		try {
			// 1. Fetch HackerNews (Limit: 2)
			console.log("Crawling HackerNews...");
			try {
				const hnArticles = await crawlHackerNews();
				const limitedHN = hnArticles.slice(0, 1);

				// Fetch comments for HN
				for (const article of limitedHN) {
					const hnDiscussionUrl = `https://news.ycombinator.com/item?id=${article.id.replace("hn-", "")}`;
					const comments = await fetchHNArticleContent(hnDiscussionUrl);
					if (comments) {
						article.originalContent = `${article.originalTitle}\n\n${comments}`;
					}
				}
				allArticles.push(...limitedHN);
				console.log(`Added ${limitedHN.length} HackerNews articles`);
			} catch (e) {
				console.error("Error crawling HackerNews:", e);
			}

			// 2. Fetch T24 (Limit: 3)
			console.log("Crawling T24...");
			try {
				const t24Articles = await crawlT24(env);
				const limitedT24 = t24Articles.slice(0, 1);

				// Fetch full content for T24
				for (const article of limitedT24) {
					if (article.originalContent && article.originalContent.length < 100) {
						const fullContent = await fetchT24ArticleDetail(
							article.originalUrl,
							env,
						);
						if (fullContent) {
							article.originalContent = fullContent;
						}
					}
				}
				allArticles.push(...limitedT24);
				console.log(`Added ${limitedT24.length} T24 articles`);
			} catch (e) {
				console.error("Error crawling T24:", e);
			}

			// 3. Fetch Eksisozluk (Limit: 3)
			console.log("Crawling Eksisozluk...");
			try {
				const eksiArticles = await crawlEksisozluk(env);
				const limitedEksi = eksiArticles.slice(0, 1);

				// Fetch content for Eksi
				for (const article of limitedEksi) {
					if (!article.originalContent) {
						article.originalContent = await fetchEksisozlukDetail(
							article.originalUrl,
							env,
							article.originalTitle,
						);
						if (!article.originalContent) {
							article.originalContent = article.originalTitle;
						}
					}
				}
				allArticles.push(...limitedEksi);
				console.log(`Added ${limitedEksi.length} Eksisozluk articles`);
			} catch (e) {
				console.error("Error crawling Eksisozluk:", e);
			}

			if (allArticles.length === 0) {
				console.log("No articles to process");
				return;
			}

			// Transform and save all articles with robust fallback
			console.log(`Processing ${allArticles.length} total articles...`);
			const processedArticles: NewsArticle[] = [];

			for (const article of allArticles) {
				try {
					console.log(`[Scheduled] Transforming ${article.id}...`);
					const transformed = await transformContent(article, env);

					console.log(`[Scheduled] Saving ${article.id}...`);
					await saveArticleToR2(transformed, env);
					processedArticles.push(transformed);
				} catch (error) {
					console.error(`Error processing article ${article.id}:`, error);
					// Fallback: Save original article if transformation/saving fails
					try {
						console.log(
							`[Scheduled] Fallback: Saving original ${article.id}...`,
						);
						await saveArticleToR2(article, env);
						processedArticles.push(article);
					} catch (fallbackError) {
						console.error(
							`CRITICAL: Failed to save fallback for ${article.id}:`,
							fallbackError,
						);
					}
				}
			}

			console.log(
				`Successfully processed ${processedArticles.length} articles`,
			);

			// Send Push Notifications for new articles
			if (processedArticles.length > 0) {
				console.log(
					`Queueing push notification for ${processedArticles.length} articles...`,
				);
				ctx.waitUntil(sendPushNotifications(processedArticles, env));
			}
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
		const body = (await request.json()) as {
			sources?: string[];
			count?: number;
			sync?: boolean;
		};
		const sources = body.sources || ["eksisozluk"];
		const count = body.count || 5;
		const sync = body.sync ?? true; // Default to sync processing

		const allArticles: NewsArticle[] = [];

		// Crawl based on sources array
		if (sources.includes("eksisozluk") || sources.includes("all")) {
			console.log("Crawling Eksisozluk...");
			const eksiArticles = await crawlEksisozluk(env);
			const limitedEksi = eksiArticles.slice(0, count);

			// Fetch content using SERPER for each article
			console.log(
				`Fetching content for ${limitedEksi.length} eksisozluk articles...`,
			);
			for (const article of limitedEksi) {
				if (!article.originalContent) {
					console.log(`[Eksi] Fetching: ${article.originalUrl}`);
					article.originalContent = await fetchEksisozlukDetail(
						article.originalUrl,
						env,
						article.originalTitle,
					);
					if (!article.originalContent) {
						article.originalContent = article.originalTitle;
						console.warn(
							`[Eksi] Using title as content fallback for ${article.id}`,
						);
					}
				}
			}
			allArticles.push(...limitedEksi);
			console.log(`Crawled ${limitedEksi.length} eksisozluk articles`);
		}

		if (sources.includes("hackernews") || sources.includes("all")) {
			console.log("Crawling HackerNews...");
			const hnArticles = await crawlHackerNews();
			const limitedHN = hnArticles.slice(0, count);

			// Fetch comments for each HN article
			console.log(`Fetching comments for ${limitedHN.length} HN articles...`);
			for (const article of limitedHN) {
				// Use the HN discussion URL to get comments
				const hnDiscussionUrl = `https://news.ycombinator.com/item?id=${article.id.replace("hn-", "")}`;
				console.log(`[HN] Fetching comments: ${hnDiscussionUrl}`);
				const comments = await fetchHNArticleContent(hnDiscussionUrl);
				if (comments) {
					article.originalContent = `${article.originalTitle}\n\n${comments}`;
					console.log(
						`[HN] Got ${comments.length} chars of comments for ${article.id}`,
					);
				} else {
					console.warn(`[HN] No comments found for ${article.id}, using title`);
				}
			}
			allArticles.push(...limitedHN);
			console.log(`Crawled ${limitedHN.length} hackernews articles`);
		}

		if (sources.includes("wikipedia") || sources.includes("all")) {
			console.log("Crawling Wikipedia...");
			const wikiArticles = await crawlWikipedia();
			allArticles.push(...wikiArticles.slice(0, count));
			console.log(
				`Crawled ${Math.min(wikiArticles.length, count)} wikipedia articles`,
			);
		}

		if (sources.includes("reddit") || sources.includes("all")) {
			console.log("Crawling Reddit...");
			const redditArticles = await crawlReddit(env);
			allArticles.push(...redditArticles.slice(0, count));
			console.log(
				`Crawled ${Math.min(redditArticles.length, count)} reddit articles`,
			);
		}

		if (sources.includes("t24") || sources.includes("all")) {
			console.log("Crawling T24...");
			const t24Articles = await crawlT24(env);
			const limitedT24 = t24Articles.slice(0, count);

			// Optionally fetch full content for t24 articles
			for (const article of limitedT24) {
				if (article.originalContent && article.originalContent.length < 100) {
					console.log(`[T24] Fetching full content: ${article.originalUrl}`);
					const fullContent = await fetchT24ArticleDetail(
						article.originalUrl,
						env,
					);
					if (fullContent) {
						article.originalContent = fullContent;
					}
				}
			}
			allArticles.push(...limitedT24);
			console.log(`Crawled ${limitedT24.length} t24 articles`);
		}

		// Limit total articles
		const articlesToProcess = allArticles.slice(0, count);

		if (sync) {
			// Process synchronously - wait for AI transformation and image generation
			const processedArticles: NewsArticle[] = [];
			for (const article of articlesToProcess) {
				try {
					console.log(`[Sync] Transforming article ${article.id}...`);
					const transformed = await transformContent(article, env);
					console.log(`[Sync] Saving article ${article.id}...`);
					const saved = await saveArticleToR2(transformed, env);
					processedArticles.push(saved);
					console.log(`[Sync] ✓ Completed ${article.id}`);
				} catch (error) {
					console.error(`Error processing article ${article.id}:`, error);
					// Save without transformation on error
					await saveArticleToR2(article, env);
					processedArticles.push(article);
				}
			}

			// Send push notifications if sync processing was successful and we have articles
			if (processedArticles.length > 0) {
				ctx.waitUntil(sendPushNotifications(processedArticles, env));
			}

			return new Response(
				JSON.stringify({
					success: true,
					count: processedArticles.length,
					status: "completed",
					articles: processedArticles,
				}),
				{ headers: { ...corsHeaders, "Content-Type": "application/json" } },
			);
		} else {
			// Process in background (original behavior)
			ctx.waitUntil(
				(async () => {
					try {
						let processedCount = 0;
						for (const article of articlesToProcess) {
							try {
								const transformed = await transformContent(article, env);
								await saveArticleToR2(transformed, env);
								processedCount++;
							} catch (error) {
								console.error(`Error processing article ${article.id}:`, error);
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

			return new Response(
				JSON.stringify({
					success: true,
					count: articlesToProcess.length,
					status: "processing",
				}),
				{ headers: { ...corsHeaders, "Content-Type": "application/json" } },
			);
		}
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

async function handleSubscribe(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>,
): Promise<Response> {
	try {
		const subscription = await request.json();

		// Use endpoint as unique ID
		// @ts-ignore
		const id = btoa(subscription.endpoint).substring(0, 32);

		await env.NEWS_KV.put(`sub:${id}`, JSON.stringify(subscription));

		return new Response(JSON.stringify({ success: true }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error subscribing:", error);
		return new Response(JSON.stringify({ error: "Failed to subscribe" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
}

async function handleTestPush(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>,
): Promise<Response> {
	try {
		const body = (await request.json()) as { title?: string; message?: string };
		const title = body.title || "Test Notification";
		const message =
			body.message || "This is a test push notification from the backend.";

		console.log(`Sending test push: ${title} - ${message}`);

		// Configure VAPID
		const vapidKeys = {
			subject: env.VAPID_SUBJECT,
			publicKey:
				"BIxjCPXkLoit-hiaK21vupJXRhxqaksULZ6l-hheRdLLwLPcveNMYKizT64rKbqzZdRxSKcI3QXvSAR8dXmcpTM",
			privateKey: env.VAPID_PRIVATE_KEY,
		};

		const { keys } = await env.NEWS_KV.list({ prefix: "sub:" });
		let successCount = 0;
		let failCount = 0;
		const errors: any[] = [];

		const payload = JSON.stringify({
			title,
			body: message,
			url: "/?test=true",
			icon: "/icons/icon-192.png",
			badge: "/icons/badge-72.png",
		});

		// Helper function for single push
		const sendPush = async (key: { name: string }) => {
			try {
				const subData = await env.NEWS_KV.get(key.name);
				if (!subData) return;

				const subscription = JSON.parse(subData);

				// Use generateRequestDetails to avoid internal https.request
				const options = {
					vapidDetails: vapidKeys,
					TTL: 60,
				};

				// web-push generateRequestDetails returns: { endpoint, method, headers, body }
				// @ts-ignore - webpush types might be incomplete
				const details = await webpush.generateRequestDetails(
					subscription,
					payload,
					options,
				);

				const response = await fetch(details.endpoint, {
					method: "POST",
					headers: details.headers,
					body: details.body,
				});

				if (!response.ok) {
					if (response.status === 410 || response.status === 404) {
						await env.NEWS_KV.delete(key.name);
					}
					throw new Error(
						`Push service responded with ${response.status} ${await response.text()}`,
					);
				}

				return true;
			} catch (error: any) {
				console.error(`Push failed for ${key.name}:`, error);
				return {
					error: error.message || error.toString(),
					key: key.name,
					statusCode: error.statusCode,
				}; // Return error object
			}
		};

		// Run all pushes in parallel
		const results = await Promise.allSettled(keys.map((key) => sendPush(key)));

		// Process results
		for (const result of results) {
			if (result.status === "fulfilled") {
				if (result.value === true) {
					successCount++;
				} else if (result.value) {
					// It's an error object
					failCount++;
					errors.push(result.value);
				}
			} else {
				// Should not happen as we catch inside sendPush, but just in case
				failCount++;
				errors.push({ error: "Promise rejected", reason: result.reason });
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				sent: successCount,
				failed: failCount,
				errors,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error in test push:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
}

async function sendPushNotifications(
	articles: NewsArticle[],
	env: Env,
): Promise<void> {
	if (articles.length === 0) return;

	console.log("Sending push notifications...");

	// Configure VAPID
	webpush.setVapidDetails(
		env.VAPID_SUBJECT,
		"BIxjCPXkLoit-hiaK21vupJXRhxqaksULZ6l-hheRdLLwLPcveNMYKizT64rKbqzZdRxSKcI3QXvSAR8dXmcpTM",
		env.VAPID_PRIVATE_KEY,
	);

	try {
		const { keys } = await env.NEWS_KV.list({ prefix: "sub:" });
		console.log(`Found ${keys.length} subscriptions`);

		if (keys.length === 0) return;

		// Create notification payload
		const firstArticle = articles[0];
		if (!firstArticle) return;

		const articleTitle =
			firstArticle.transformedTitle || firstArticle.originalTitle;

		const notification = {
			title: "New Articles available",
			body: `${articles.length} new stories added. Top: ${articleTitle}`,
			url: `/?article=${firstArticle.id}`,
			icon: "/icons/icon-192.png",
			badge: "/icons/badge-72.png",
		};

		const payload = JSON.stringify(notification);

		// Helper to send single push
		const sendPush = async (key: { name: string }) => {
			try {
				const subData = await env.NEWS_KV.get(key.name);
				if (!subData) return;

				const subscription = JSON.parse(subData);

				const options = {
					vapidDetails: {
						subject: env.VAPID_SUBJECT,
						publicKey:
							"BIxjCPXkLoit-hiaK21vupJXRhxqaksULZ6l-hheRdLLwLPcveNMYKizT64rKbqzZdRxSKcI3QXvSAR8dXmcpTM",
						privateKey: env.VAPID_PRIVATE_KEY,
					},
					TTL: 60,
				};

				// @ts-ignore
				const details = await webpush.generateRequestDetails(
					subscription,
					payload,
					options,
				);

				const response = await fetch(details.endpoint, {
					method: "POST",
					headers: details.headers,
					body: details.body,
				});

				if (!response.ok) {
					if (response.status === 410) {
						console.log(`Subscription expired (410): ${key.name}`);
						await env.NEWS_KV.delete(key.name);
					}
					throw new Error(
						`Push failed: ${response.status} ${await response.text()}`,
					);
				}
				console.log(`Push sent to ${key.name}`);
			} catch (error: any) {
				console.error(`Push error for ${key.name}:`, error);
			}
		};

		// Send all in parallel
		await Promise.allSettled(keys.map((key) => sendPush(key)));
	} catch (error) {
		console.error("Error sending push notifications:", error);
	}
}
