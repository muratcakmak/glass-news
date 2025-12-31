/**
 * Application-wide constants
 */

/** VAPID public key for push notifications */
export const VAPID_PUBLIC_KEY =
	"BIxjCPXkLoit-hiaK21vupJXRhxqaksULZ6l-hheRdLLwLPcveNMYKizT64rKbqzZdRxSKcI3QXvSAR8dXmcpTM";

/** Maximum articles to keep in index per source */
export const MAX_ARTICLES_PER_SOURCE = 100;

/** Maximum articles to keep in global index */
export const MAX_ARTICLES_GLOBAL = 200;

/** Default article limit for API requests */
export const DEFAULT_ARTICLE_LIMIT = 20;

/** KV TTL for indexes (7 days) */
export const INDEX_TTL = 60 * 60 * 24 * 7;

/** Push notification TTL (60 seconds) */
export const PUSH_TTL = 60;

/** Default number of articles to crawl per source */
export const DEFAULT_CRAWL_LIMIT = 5;

/** Maximum content length for AI transformation */
export const MAX_CONTENT_LENGTH = 2000;

/** Batch size for parallel article processing */
export const BATCH_SIZE = 5;

/** Delay between batches (ms) */
export const BATCH_DELAY = 1000;

/** Cache control for thumbnails */
export const THUMBNAIL_CACHE_CONTROL = "public, max-age=31536000";

/** Source mapping for article ID prefixes */
export const SOURCE_MAP: Record<string, string> = {
	wiki: "wikipedia",
	hn: "hackernews",
	t24: "t24",
	eksisozluk: "eksisozluk",
	reddit: "reddit",
	webrazzi: "webrazzi",
	bbc: "bbc",
};

/** All possible news sources */
export const NEWS_SOURCES = [
	"hackernews",
	"t24",
	"eksisozluk",
	"reddit",
	"wikipedia",
	"webrazzi",
	"bbc",
] as const;
