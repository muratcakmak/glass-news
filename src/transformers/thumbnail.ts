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
	if (!env || !env.GEMINI_API_KEY) {
		console.error("GEMINI_API_KEY not configured");
		return null;
	}

	try {
		const geminiGenerated = await generateGeminiThumbnail(article, env);
		if (geminiGenerated) {
			return geminiGenerated;
		}
	} catch (error) {
		console.error("Gemini thumbnail generation failed:", error);
	}

	// Fallback to null - will use simple URL placeholder
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

		// Improved System Prompt for Apple Liquid Glass aesthetic derived from research
		const prompt = `Generate a 1024x1024 square thumbnail in strict Apple Liquid Glass aesthetic: frosted glassmorphism with translucent refractive blur (20px), subtle white light border (1px rgba(255,255,255,0.2)), premium minimal curves (24px radius), generous whitespace, vibrant gradient backdrop. Overlay ${themes} as sharp central motif with dynamic depth layering, iOS app icon vibe, high contrast readability, no text/logos, clean hardware polish. Reference context: ${title}`;

		console.log(`Generating Gemini image for ${article.id}...`);

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
			console.error("Gemini API error:", response.status, errorText);
			return null;
		}

		const data = (await response.json()) as any;

		// Check for inline_data (standard for Gemini image responses)
		// The structure typically involves candidates[0].content.parts[0].inline_data
		const part = data.candidates?.[0]?.content?.parts?.[0];
		if (part?.inline_data?.mime_type && part?.inline_data?.data) {
			const base64Data = part.inline_data.data;
			const mimeType = part.inline_data.mime_type;

			// Convert base64 to Blob
			const byteCharacters = atob(base64Data);
			const byteNumbers = new Array(byteCharacters.length);
			for (let i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			const byteArray = new Uint8Array(byteNumbers);
			return new Blob([byteArray], { type: mimeType });
		}

		console.error("Unexpected Gemini response structure");
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
