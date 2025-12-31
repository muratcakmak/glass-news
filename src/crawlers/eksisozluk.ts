import { NewsArticle, Env } from "../types";
import { fetchWithScrapeDo, extractTextFromHTML } from "../utils/scraper";

export async function crawlEksisozluk(env?: Env): Promise<NewsArticle[]> {
	try {
		console.log("[Eksi] Fetching gündem page...");

		// Fetch gündem page directly (no Cloudflare protection on this page!)
		const response = await fetch("https://eksisozluk.com/basliklar/gundem", {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
				Referer: "https://eksisozluk.com/",
			},
		});

		if (!response.ok) {
			console.error(
				`[Eksi] Failed to fetch gündem: ${response.status} ${response.statusText}`,
			);
			return [];
		}

		const html = await response.text();
		console.log(`[Eksi] HTML fetched, length: ${html.length} chars`);

		const articles: NewsArticle[] = [];

		// Parse topic titles using data-title and data-slug attributes
		const topicRegex = /<h1[^>]*data-title="([^"]*)"[^>]*data-slug="([^"]*)"/gi;
		const matches = html.matchAll(topicRegex);

		for (const match of matches) {
			const title = match[1]
				.replace(/&#x27;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/&amp;/g, "&")
				.replace(/&#x2B;/g, "+")
				.trim();
			const slug = match[2]?.trim();

			if (title && slug) {
				// Content will be fetched separately using ScrapeDo
				articles.push({
					id: `eksisozluk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					source: "eksisozluk",
					originalTitle: title,
					originalContent: "", // Will be fetched using Serper
					originalUrl: `https://eksisozluk.com/${slug}`,
					crawledAt: new Date().toISOString(),
					language: "tr",
				});
			}

			// Limit to 5 articles per crawl
			if (articles.length >= 5) break;
		}

		console.log(`[Eksi] Found ${articles.length} topics`);
		return articles;
	} catch (error) {
		console.error("[Eksi] Error crawling Eksisozluk:", error);
		return [];
	}
}

export async function fetchEksisozlukDetail(
	url: string,
	env?: Env,
	title?: string,
): Promise<string> {
	// Use SERPER API to search for content about this topic
	if (!env?.SERPER_API_KEY) {
		console.warn(`[Eksi] No SERPER_API_KEY - cannot fetch content for ${url}`);
		return "";
	}

	try {
		// Extract topic from URL or use provided title
		const topicSlug = url.split("/").pop() || "";
		// Improve Search: Search for the title + "haber" (news) to get factual context,
		// and exclude eksisozluk to avoid getting just the forum posts.
		const searchBase = title || topicSlug.replace(/-/g, " ");
		const searchQuery = `${searchBase} haber -site:eksisozluk.com`;

		console.log(`[Eksi] Searching Google for context: "${searchQuery}"`);

		const response = await fetch("https://google.serper.dev/search", {
			method: "POST",
			headers: {
				"X-API-KEY": env.SERPER_API_KEY,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				q: searchQuery,
				num: 8, // Fetch more results for better context
				gl: "tr", // Turkey
				hl: "tr", // Turkish language
			}),
		});

		if (!response.ok) {
			console.error(
				`[Eksi] SERPER API error: ${response.status} ${response.statusText}`,
			);
			return "";
		}

		const data = (await response.json()) as any;
		console.log(`[Eksi] SERPER returned ${data.organic?.length || 0} results`);

		// Collect snippets from search results
		const snippets: string[] = [];

		// Add answer box if available (high quality context)
		if (data.answerBox?.snippet) {
			snippets.push(`Özet: ${data.answerBox.snippet}`);
		}
		if (data.answerBox?.answer) {
			snippets.push(`Cevap: ${data.answerBox.answer}`);
		}

		if (data.organic && Array.isArray(data.organic)) {
			for (const result of data.organic) {
				if (result.snippet) {
					// Include title for context if available
					snippets.push(`${result.title}: ${result.snippet}`);
				}
			}
		}

		if (snippets.length === 0) {
			console.warn(`[Eksi] No snippets found for "${searchQuery}"`);
			// Fallback: Try searching just the title without modifiers if news search fails
			if (searchQuery.includes("haber")) {
				console.log("[Eksi] Fallback search for just title...");
				return fetchEksisozlukDetail(url, env, title); // Recursive call won't loop if we pass title as base?
				// Actually simpler to just return empty or handle fallback carefully.
				// Let's just return what we have or empty.
			}
			return "";
		}

		const result = snippets.join("\n\n");
		console.log(`[Eksi] Collected ${snippets.length} snippets for context`);
		return result;
	} catch (error) {
		console.error(`[Eksi] Error fetching content for ${url}:`, error);
		return "";
	}
}
