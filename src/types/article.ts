/**
 * Represents a news article from any source
 */
export interface NewsArticle {
	id: string;
	source: "t24" | "eksisozluk" | "hackernews" | "wikipedia" | "reddit" | "webrazzi" | "bbc";
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
