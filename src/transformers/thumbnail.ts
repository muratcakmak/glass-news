import { NewsArticle, Env } from "../types";

/**
 * Extract key themes from article for prompt generation
 */
function extractThemes(title: string, content: string): string {
	const text = `${title} ${content}`.toLowerCase();

	// Simple keyword extraction based on common themes
	const themeMap: Record<string, string[]> = {
		"technology and innovation": [
			"ai",
			"tech",
			"software",
			"computer",
			"digital",
			"innovation",
			"startup",
			"code",
		],
		"business and economy": [
			"business",
			"market",
			"economy",
			"finance",
			"trade",
			"company",
			"investment",
		],
		"science and discovery": [
			"science",
			"research",
			"study",
			"discovery",
			"space",
			"climate",
			"nature",
		],
		"culture and society": [
			"culture",
			"art",
			"music",
			"film",
			"book",
			"society",
			"people",
			"community",
		],
		"politics and governance": [
			"government",
			"politics",
			"election",
			"policy",
			"law",
			"democracy",
		],
		"global events": [
			"world",
			"international",
			"global",
			"country",
			"nation",
			"war",
			"peace",
		],
		"urban life and cities": [
			"city",
			"urban",
			"architecture",
			"building",
			"street",
			"neighborhood",
		],
		"knowledge and learning": [
			"education",
			"learning",
			"university",
			"school",
			"knowledge",
			"wisdom",
		],
	};

	let bestTheme = "abstract concepts and ideas";
	let bestScore = 0;

	for (const [theme, keywords] of Object.entries(themeMap)) {
		const score = keywords.filter((kw) => text.includes(kw)).length;
		if (score > bestScore) {
			bestScore = score;
			bestTheme = theme;
		}
	}

	return bestTheme;
}

/**
 * Generate thumbnail using OpenAI GPT-Image-1.5
 * Square format (1024x1024) optimized for glassmorphism design
 * Enforces 60 images/day limit to save costs
 */
/**
 * Generate thumbnail using Google Gemini 2.5 Flash
 * Generates 1024x1024 square images
 */
export async function generateThumbnail(
	article: NewsArticle,
	env?: Env,
): Promise<Blob | null> {
	console.log(`[Thumbnail] generateThumbnail called for ${article.id}`);

	// Validate environment and API key
	if (!env || !env.GEMINI_API_KEY) {
		console.warn(
			`[Thumbnail] GEMINI_API_KEY missing for ${article.id}. Env present: ${!!env}, Key present: ${!!env?.GEMINI_API_KEY}`,
		);
		return null;
	}

	try {
		console.log(
			`[Thumbnail] Calling Gemini image generation for ${article.id}...`,
		);
		const startTime = Date.now();
		const geminiGenerated = await generateGeminiThumbnail(article, env);
		const duration = Date.now() - startTime;

		if (geminiGenerated) {
			console.log(
				`[Thumbnail] ✓ Success for ${article.id}. Size: ${geminiGenerated.size} bytes, Type: ${geminiGenerated.type}, Duration: ${duration}ms`,
			);
			return geminiGenerated;
		} else {
			console.warn(
				`[Thumbnail] ✗ Generation returned null for ${article.id} after ${duration}ms`,
			);
		}
	} catch (error) {
		console.error(
			`[Thumbnail] ✗ Exception during generation for ${article.id}:`,
			error instanceof Error ? error.message : error,
		);
	}

	// Fallback to null - caller will use simple URL placeholder
	console.log(`[Thumbnail] Using fallback for ${article.id}`);
	return null;
}

/**
 * Generate thumbnail using Gemini 2.5 Flash
 */
async function generateGeminiThumbnail(
	article: NewsArticle,
	env: Env,
): Promise<Blob | null> {
	try {
		const apiKey = env.GEMINI_API_KEY;
		const title = article.transformedTitle || article.originalTitle;
		const content = (
			article.transformedContent ||
			article.originalContent ||
			""
		).slice(0, 500);
		const themes = extractThemes(title, content);

		// Apple-style Editorial Illustration Prompt
		// Derived from "Midjourney style editorial illustration", "corporate memphis but premium", "abstract figures"
		const prompt = `Create a premium, editorial-style illustration for a news article titled: "${title}".

Style Guide:
- Aesthetic: Apple News / New York Times Magazine cover style.
- Visuals: Abstract, minimalist figures (NO realistic faces, NO facial features). Use silhouettes or soft shapes to represent people.
- Composition: Clean, spacious, using negative space effectively. Balanced and harmonious.
- Color Palette: Sophisticated, muted tones (pastels, soft blues, creams, stone greys) with one vibrant accent color (like a deep coral or electric blue).
- Texture: Soft gradients, smooth vector-like shapes with subtle grain or noise for a "printed" feel.
- Mood: Intellectual, modern, calm, and trustworthy.
- Elements: Use symbolic metaphors related to "${themes.split(",")[0]}" (e.g., spheres for global, lines for connection, organic blobs for creativity).

Strict Constraints:
- NO TEXT.
- NO LOGOS.
- NO REALISTIC PHOTO ELEMENTS.
- NO CLUTTER.
- Figures must be faceless and stylized.

The image should look like a high-end commission for a top-tier design magazine.`;

		console.log(`[Thumbnail] Sending Gemini API request for ${article.id}...`);

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [{ text: prompt }],
						},
					],
				}),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`[Thumbnail] Gemini API error for ${article.id}: Status ${response.status}`,
				errorText,
			);
			return null;
		}

		console.log(
			`[Thumbnail] Gemini API response OK for ${article.id}. Parsing...`,
		);
		const data = (await response.json()) as any;

		// Validate response structure
		if (!data.candidates || data.candidates.length === 0) {
			console.error(
				`[Thumbnail] No candidates in response for ${article.id}`,
				JSON.stringify(data).slice(0, 500),
			);
			return null;
		}

		// Check for inline_data (standard for Gemini image responses)
		// The structure: candidates[0].content.parts[*].inline_data
		// API might return camelCase (inlineData) or snake_case (inline_data)
		const parts = data.candidates[0]?.content?.parts || [];

		console.log(
			`[Thumbnail] Found ${parts.length} parts in response for ${article.id}`,
		);

		for (const part of parts) {
			const inlineData = part.inline_data || part.inlineData;
			if (inlineData) {
				const base64Data = inlineData.data;
				const mimeType = inlineData.mime_type || inlineData.mimeType;

				if (base64Data && mimeType) {
					console.log(
						`[Thumbnail] Found image data for ${article.id}. MIME: ${mimeType}, Size: ${base64Data.length} chars`,
					);

					// Convert base64 to Blob more efficiently
					try {
						const byteCharacters = atob(base64Data);
						const byteNumbers = new Uint8Array(byteCharacters.length);
						for (let i = 0; i < byteCharacters.length; i++) {
							byteNumbers[i] = byteCharacters.charCodeAt(i);
						}
						const blob = new Blob([byteNumbers], { type: mimeType });
						console.log(
							`[Thumbnail] Created blob for ${article.id}. Size: ${blob.size} bytes`,
						);
						return blob;
					} catch (decodeError) {
						console.error(
							`[Thumbnail] Base64 decode error for ${article.id}:`,
							decodeError,
						);
						return null;
					}
				}
			}
		}

		console.error(
			`[Thumbnail] No image data found in response for ${article.id}`,
			`Response keys: ${Object.keys(data).join(", ")}`,
			`First candidate keys: ${Object.keys(data.candidates[0] || {}).join(", ")}`,
		);
		return null;
	} catch (error) {
		console.error("Error in generateGeminiThumbnail:", error);
		return null;
	}
}

/**
 * Fallback: Generate pattern-based thumbnail using DiceBear
 */
async function generatePatternThumbnail(
	article: NewsArticle,
): Promise<Blob | null> {
	try {
		const seed = encodeURIComponent(article.id);
		const styles = ["shapes", "identicon"];
		const styleIndex = Math.abs(hashCode(article.id)) % styles.length;

		const thumbnailUrl = `https://api.dicebear.com/7.x/${styles[styleIndex]}/png?seed=${seed}&size=400`;

		const response = await fetch(thumbnailUrl);

		if (!response.ok) {
			// Silently fail and return null - will use URL-based fallback
			return null;
		}

		return await response.blob();
	} catch (error) {
		// Silently fail and return null
		return null;
	}
}

/**
 * Generate a simple URL-based thumbnail (final fallback)
 */
export function generateSimpleThumbnailUrl(article: NewsArticle): string {
	const colors = [
		"FF6B6B-4ECDC4", // Red to Teal
		"6C5CE7-A29BFE", // Purple to Light Purple
		"FD79A8-FDCB6E", // Pink to Yellow
		"00B894-00CEC9", // Green to Cyan
		"E17055-FDCB6E", // Orange to Yellow
		"0984E3-74B9FF", // Blue to Light Blue
	];

	const colorPair = colors[Math.abs(hashCode(article.id)) % colors.length];
	const title = encodeURIComponent(
		article.transformedTitle || article.originalTitle,
	);

	return `https://via.placeholder.com/400x300/${colorPair}/FFFFFF?text=${title.slice(0, 50)}`;
}

function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return hash;
}
