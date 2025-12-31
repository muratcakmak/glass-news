import { NewsArticle, Env } from "../types";
import { generateThumbnail } from "../transformers/thumbnail";

export async function saveArticleToR2(
	article: NewsArticle,
	env: Env,
): Promise<NewsArticle> {
	try {
		// Generate and upload thumbnail (only real generated images, no fallback)
		console.log(
			`[Storage] Generating thumbnail for ${article.id}... Has Gemini Key: ${!!env.GEMINI_API_KEY}`,
		);
		const thumbnail = await generateThumbnail(article, env);
		let thumbnailUrl = "";

		if (thumbnail) {
			console.log(
				`[Storage] Generated thumbnail blob - Size: ${thumbnail.size} bytes, Type: ${thumbnail.type}`,
			);

			// Determine file extension from MIME type
			const extension = thumbnail.type.includes("png") ? "png" : "jpg";
			const thumbnailKey = `thumbnails/${article.id}.${extension}`;

			try {
				await env.NEWS_BUCKET.put(thumbnailKey, thumbnail, {
					httpMetadata: {
						contentType: thumbnail.type || "image/png",
						cacheControl: "public, max-age=31536000", // Cache for 1 year
					},
				});
				// Update thumbnail URL to R2 URL (will be accessible via public domain)
				thumbnailUrl = `/thumbnails/${article.id}.${extension}`;
				console.log(
					`[Storage] Successfully uploaded thumbnail to ${thumbnailKey}`,
				);
			} catch (uploadError) {
				console.error(
					`[Storage] Failed to upload thumbnail for ${article.id}:`,
					uploadError,
				);
				// No fallback - leave empty
				thumbnailUrl = "";
			}
		} else {
			console.log(
				`[Storage] Thumbnail generation failed or returned null. No thumbnail URL set.`,
			);
		}

		// Save article with thumbnail URL
		const articleWithThumbnail = {
			...article,
			thumbnailUrl,
		};

		// Store the article as JSON
		const articleKey = `articles/${article.source}/${article.id}.json`;
		await env.NEWS_BUCKET.put(
			articleKey,
			JSON.stringify(articleWithThumbnail, null, 2),
			{
				httpMetadata: {
					contentType: "application/json",
				},
				customMetadata: {
					source: article.source,
					language: article.language,
					crawledAt: article.crawledAt,
				},
			},
		);

		// Update index in KV for quick lookups
		await updateArticleIndex(article, env);

		return articleWithThumbnail;
	} catch (error) {
		console.error("Error saving article to R2:", error);
		throw error;
	}
}

async function updateArticleIndex(
	article: NewsArticle,
	env: Env,
): Promise<void> {
	try {
		console.log(
			`Updating index for article: ${article.id}, source: ${article.source}`,
		);

		// Get current index
		const indexKey = `index:${article.source}`;
		const existingIndex = (await env.NEWS_KV.get(indexKey, "json")) || [];
		console.log(`Existing index for ${indexKey}:`, existingIndex);

		// Add new article ID to the beginning (most recent first)
		const updatedIndex = [
			article.id,
			...existingIndex.filter((id) => id !== article.id),
		];

		// Keep only the last 100 articles per source
		const trimmedIndex = updatedIndex.slice(0, 100);

		console.log(`Saving ${trimmedIndex.length} articles to ${indexKey}`);

		// Save updated index
		await env.NEWS_KV.put(indexKey, JSON.stringify(trimmedIndex), {
			expirationTtl: 60 * 60 * 24 * 7, // 7 days
		});

		console.log(`Successfully saved index ${indexKey}`);

		// Also update a global index
		const globalIndexKey = "index:all";
		const globalIndex = (await env.NEWS_KV.get(globalIndexKey, "json")) || [];
		const updatedGlobalIndex = [
			article.id,
			...globalIndex.filter((id) => id !== article.id),
		];
		const trimmedGlobalIndex = updatedGlobalIndex.slice(0, 200);

		await env.NEWS_KV.put(globalIndexKey, JSON.stringify(trimmedGlobalIndex), {
			expirationTtl: 60 * 60 * 24 * 7, // 7 days
		});

		console.log(`Successfully saved global index`);
	} catch (error) {
		console.error("Error updating article index:", error);
		throw error; // Re-throw to see the error
	}
}

export async function getArticleFromR2(
	articleId: string,
	source: string,
	env: Env,
): Promise<NewsArticle | null> {
	try {
		const articleKey = `articles/${source}/${articleId}.json`;
		const object = await env.NEWS_BUCKET.get(articleKey);

		if (!object) {
			return null;
		}

		const text = await object.text();
		return JSON.parse(text) as NewsArticle;
	} catch (error) {
		console.error("Error getting article from R2:", error);
		return null;
	}
}

export async function listArticles(
	source: string | null,
	limit: number,
	env: Env,
): Promise<NewsArticle[]> {
	try {
		console.log(`listArticles called: source=${source}, limit=${limit}`);
		const indexKey = source ? `index:${source}` : "index:all";
		console.log(`Reading index key: ${indexKey}`);
		const index = (await env.NEWS_KV.get(indexKey, "json")) || [];
		console.log(`Index retrieved:`, index, `(length: ${index.length})`);

		const articleIds = index.slice(0, limit);
		console.log(`Article IDs to fetch:`, articleIds);
		const articles: NewsArticle[] = [];

		// Fetch articles in parallel
		const articlePromises = articleIds.map(async (id) => {
			// Extract source from ID (format: source-timestamp-random)
			let articleSource = id.split("-")[0];
			// Map ID prefixes to actual source names
			const sourceMap: Record<string, NewsArticle["source"]> = {
				wiki: "wikipedia",
				hn: "hackernews",
				t24: "t24",
				eksisozluk: "eksisozluk",
				reddit: "reddit",
			};
			articleSource = sourceMap[articleSource] || articleSource;
			console.log(`Fetching article: ${id} from source: ${articleSource}`);
			return getArticleFromR2(id, articleSource as NewsArticle["source"], env);
		});

		const results = await Promise.all(articlePromises);
		console.log(`Fetched ${results.length} results from R2`);

		for (const article of results) {
			if (article) {
				articles.push(article);
			} else {
				console.log("Got null article from R2");
			}
		}

		console.log(`Returning ${articles.length} articles`);
		return articles;
	} catch (error) {
		console.error("Error listing articles:", error);
		return [];
	}
}
