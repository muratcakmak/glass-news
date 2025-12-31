export interface NewsArticle {
	id: string;
	source: "t24" | "eksisozluk" | "hackernews" | "wikipedia" | "reddit";
	originalTitle: string;
	originalContent: string;
	originalUrl: string;
	transformedTitle?: string;
	transformedContent?: string;
	thumbnailUrl?: string;
	tags?: string[];
	crawledAt: string;
	publishedAt?: string;
	language: "tr" | "en";
}

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

export interface CrawlResult {
	articles: NewsArticle[];
	errors?: string[];
}
