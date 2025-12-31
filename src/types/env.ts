/**
 * Environment variables and bindings for the Worker
 */
export interface Env {
	// R2 and KV bindings
	NEWS_BUCKET: R2Bucket;
	NEWS_KV: KVNamespace;
	ASSETS: Fetcher;

	// AI/API keys
	AI?: any;
	OPENROUTER_API_KEY?: string;
	GEMINI_API_KEY?: string;
	RESEARCH_MODEL?: string;

	// Image generation
	ENABLE_AI_IMAGES?: string; // "true" to enable AI image generation (costs money), "false" for free alternatives
	UNSPLASH_API_KEY?: string; // Free tier: 50 requests/hour

	// News sources API keys
	REDDIT_CLIENT_ID?: string;
	REDDIT_CLIENT_SECRET?: string;
	SCRAPEDO_API_KEY?: string;
	SERPER_API_KEY?: string;

	// Push notifications
	VAPID_SUBJECT: string;
	VAPID_PRIVATE_KEY: string;
	VAPID_PUBLIC_KEY?: string;

	// Security
	ADMIN_API_KEY?: string; // For admin endpoint authentication
	ENCRYPTION_KEY?: string; // For encrypting sensitive KV data

	// Configuration
	PROMPT_STYLE?: "pamuk" | "direct" | "greentext" | "random";
	ENVIRONMENT?: "development" | "production";
}
