/**
 * Environment variables and bindings for the Worker
 */
export interface Env {
	NEWS_BUCKET: R2Bucket;
	NEWS_KV: KVNamespace;
	AI?: any;
	OPENROUTER_API_KEY?: string;
	REDDIT_CLIENT_ID?: string;
	REDDIT_CLIENT_SECRET?: string;
	RESEARCH_MODEL?: string;
	SCRAPEDO_API_KEY?: string;
	SERPER_API_KEY?: string;
	GEMINI_API_KEY?: string;
	PROMPT_STYLE?: "pamuk" | "direct" | "greentext" | "random";
	VAPID_SUBJECT: string;
	VAPID_PRIVATE_KEY: string;
	ASSETS: Fetcher;
}
