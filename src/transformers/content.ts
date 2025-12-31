import type { NewsArticle, Env } from "../types";

const ORHAN_PAMUK_PROMPT = `You are a literary journalist combining the introspective, layered storytelling of Orhan Pamuk with the sharp, elegant prose of The New Yorker.

Transform this news article into a compelling English narrative that:
- Opens with a vivid scene or detail that draws readers in
- Weaves multiple perspectives and layers of meaning
- Uses rich, sensory language while remaining clear and accessible
- Finds the human story within the news
- Balances reportage with literary craft
- Maintains a contemplative yet engaging tone
- Keeps the essence and facts of the original story

CRITICAL: Output MUST be in English only. If the source article is in Turkish or any other language, translate it to English while transforming it into literary prose.

Original Title: {title}
Original Content: {content}
Source: {source}

Respond with a JSON object containing:
{
  "transformedTitle": "A literary, compelling English title (maximum 80 characters, DO NOT include the character count in the output)",
  "transformedContent": "The transformed article in English (300-500 words)",
  "tags": ["3-5 relevant English tags"]
}`;

const DIRECT_STYLE_PROMPT = `You are a bold, no-nonsense writer combining the direct, brutally honest style of Mark Manson with the gritty, punchy, minimalist prose of Chuck Palahniuk.

Transform this news article into a compelling, hard-hitting narrative that:
- Uses short, punchy sentences. No fluff.
- Cuts through the noise to the raw truth.
- Uses a direct, conversational tone that grabs the reader by the collar.
- Focuses on the visceral reality of the story.
- Avoids flowery adjectives and passive voice.
- Makes every word fight for its right to be there.
- Keeps the facts but delivers them with impact.
- Maintains the essence and accuracy of the original story.

CRITICAL: Output MUST be in English only. If the source article is in Turkish or any other language, translate it to English while transforming it.

Original Title: {title}
Original Content: {content}
Source: {source}

Respond with a JSON object containing:
{
  "transformedTitle": "A punchy, direct English title (max 80 chars, NO count in output)",
  "transformedContent": "The transformed article in English (300-500 words)",
  "tags": ["3-5 relevant English tags"]
}`;

const GREENTEXT_PROMPT = `You are an anonymous user on an image board. Write a greentext story about the events in this news article.

Formatting rules:
- Every line MUST start with >
- First line MUST be > be [someone/something related to story]
- Second line MUST be > do [something related]
- All following lines keep the same style: short, punchy, first-person beats
- Present tense, super concise, minimum grammar
- Dry humor, a bit self-deprecating, not try-hard edgy
- No corporate, no "influencer" or motivational tone
- Optional closer like > mfw ... or > tfw ...

Constraints:
- Keep it readable even if the reader doesn't know 4chan culture deeply
- Avoid slurs or anything that would instantly get removed on a normal platform
- STRICTLY follow the > format. Output raw text in the transformedContent field.

Original Title: {title}
Original Content: {content}
Source: {source}

Respond with a JSON object containing:
{
  "transformedTitle": "A short, sarcastic English title (max 80 chars, NO count in output)",
  "transformedContent": "The greentext story (raw string with > line breaks preserved)",
  "tags": ["3-5 relevant English tags"]
}`;

export async function transformContent(
	article: NewsArticle,
	env: Env,
	options?: {
		customPrompt?: string;
		style?: "pamuk" | "direct" | "greentext" | "random";
	}
): Promise<NewsArticle> {
	console.log(
		`[Transform] Starting transformation for ${article.id} (${article.source})`,
	);

	try {
		// Skip transformation if no API key
		if (!env.OPENROUTER_API_KEY) {
			console.warn(
				`[Transform] No OPENROUTER_API_KEY for ${article.id} - skipping transformation`,
			);
			return {
				...article,
				transformedTitle: article.originalTitle,
				transformedContent: article.originalContent,
				tags: article.tags || [],
			};
		}

		// For Turkish sources, always try to transform at least the title
		// For other sources, skip if content is too short
		if (article.language !== "tr" && article.originalContent.length < 50) {
			console.warn(
				`[Transform] Content too short for ${article.id} (${article.originalContent.length} chars) - skipping`,
			);
			return {
				...article,
				transformedTitle: article.originalTitle,
				transformedContent: article.originalContent,
				tags: article.tags || [],
			};
		}

		let selectedPrompt: string;
		let styleName = "custom";

		// Use custom prompt if provided
		if (options?.customPrompt) {
			selectedPrompt = options.customPrompt;
			styleName = "custom";
			console.log(`[Transform] Using custom prompt for ${article.id}`);
		} else {
			// Use style from options, or fallback to environment
			const style = options?.style || env.PROMPT_STYLE || "random";

			if (style === "pamuk") {
				selectedPrompt = ORHAN_PAMUK_PROMPT;
				styleName = "pamuk";
			} else if (style === "direct") {
				selectedPrompt = DIRECT_STYLE_PROMPT;
				styleName = "direct";
			} else if (style === "greentext") {
				selectedPrompt = GREENTEXT_PROMPT;
				styleName = "greentext";
			} else if (style === "random") {
				// Randomly select one
				const styles = [
					{ name: "pamuk", prompt: ORHAN_PAMUK_PROMPT },
					{ name: "direct", prompt: DIRECT_STYLE_PROMPT },
					{ name: "greentext", prompt: GREENTEXT_PROMPT },
				];
				const randomStyle = styles[Math.floor(Math.random() * styles.length)];
				// @ts-ignore - Random select will always return a valid style
				selectedPrompt = randomStyle.prompt;
				// @ts-ignore
				styleName = randomStyle.name;
			} else {
				selectedPrompt = DIRECT_STYLE_PROMPT;
				styleName = "direct";
			}

			console.log(`[Transform] Using prompt style: ${styleName}`);
		}

		const prompt = selectedPrompt
			.replace("{title}", article.originalTitle)
			.replace("{content}", article.originalContent.slice(0, 2000)) // Limit input length
			.replace("{source}", article.source);

		console.log(`[Transform] Calling OpenRouter for ${article.id}...`);
		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
					"Content-Type": "application/json",
					"HTTP-Referer": "https://news-data.workers.dev",
					"X-Title": "News Data Transformer",
				},
				body: JSON.stringify({
					model: env.RESEARCH_MODEL || "openai/gpt-4o-mini",
					messages: [
						{
							role: "user",
							content: prompt,
						},
					],
					response_format: { type: "json_object" },
				}),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`[Transform] OpenRouter API error for ${article.id}:`,
				errorText,
			);
			return {
				...article,
				transformedTitle: article.originalTitle,
				transformedContent: article.originalContent,
				tags: article.tags || [],
			};
		}

		const data = await response.json();
		const result = JSON.parse(data.choices[0].message.content);

		// Clean up title: remove invalid characters and metadata like "(58 characters)"
		let cleanTitle = result.transformedTitle || article.originalTitle;
		cleanTitle = cleanTitle.replace(/\(\d+\s*characters?\)/gi, "").trim();
		cleanTitle = cleanTitle.replace(/^["']|["']$/g, ""); // Remove surrounding quotes

		console.log(`[Transform] ✓ Success for ${article.id}`);
		console.log(`[Transform]   Original title: "${article.originalTitle}"`);
		console.log(`[Transform]   Transformed title: "${cleanTitle}"`);
		console.log(`[Transform]   Tags: ${result.tags?.join(", ")}`);

		return {
			...article,
			transformedTitle: cleanTitle,
			transformedContent: result.transformedContent || article.originalContent,
			tags: result.tags || article.tags || [],
		};
	} catch (error) {
		console.error(
			`[Transform] ✗ Exception for ${article.id}:`,
			error instanceof Error ? error.message : error,
		);
		// Return original article on error
		return {
			...article,
			transformedTitle: article.originalTitle,
			transformedContent: article.originalContent,
			tags: article.tags || [],
		};
	}
}

export async function batchTransformContent(
	articles: NewsArticle[],
	env: Env,
): Promise<NewsArticle[]> {
	// Transform articles in parallel with a limit to avoid rate limiting
	const batchSize = 5;
	const results: NewsArticle[] = [];

	for (let i = 0; i < articles.length; i += batchSize) {
		const batch = articles.slice(i, i + batchSize);
		const transformed = await Promise.all(
			batch.map((article) => transformContent(article, env)),
		);
		results.push(...transformed);

		// Small delay between batches to avoid rate limiting
		if (i + batchSize < articles.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	return results;
}
