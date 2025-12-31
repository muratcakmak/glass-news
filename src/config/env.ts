import type { Env } from "../types";

/**
 * Validate that required environment variables are present
 */
export function validateEnv(env: Env): { valid: boolean; missing: string[] } {
	const missing: string[] = [];

	// Required bindings
	if (!env.NEWS_BUCKET) missing.push("NEWS_BUCKET");
	if (!env.NEWS_KV) missing.push("NEWS_KV");
	if (!env.VAPID_SUBJECT) missing.push("VAPID_SUBJECT");
	if (!env.VAPID_PRIVATE_KEY) missing.push("VAPID_PRIVATE_KEY");

	return {
		valid: missing.length === 0,
		missing,
	};
}

/**
 * Check if a specific feature is enabled based on environment
 */
export function hasFeature(env: Env, feature: string): boolean {
	switch (feature) {
		case "ai-transformation":
			return !!env.OPENROUTER_API_KEY;
		case "image-generation":
			return !!env.GEMINI_API_KEY;
		case "reddit":
			return !!(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET);
		case "scraping":
			return !!env.SCRAPEDO_API_KEY;
		case "search":
			return !!env.SERPER_API_KEY;
		default:
			return false;
	}
}

/**
 * Get the AI model to use for transformations
 */
export function getAIModel(env: Env): string {
	return env.RESEARCH_MODEL || "openai/gpt-4o-mini";
}

/**
 * Get the prompt style to use
 */
export function getPromptStyle(
	env: Env
): "pamuk" | "direct" | "greentext" | "random" {
	return env.PROMPT_STYLE || "random";
}
