import type { NewsArticle } from "../../src/types";

/**
 * Test fixtures for articles
 */

export const mockHNArticle: NewsArticle = {
	id: "hackernews-12345",
	source: "hackernews",
	originalTitle: "Show HN: My Cool Project",
	originalContent: "I built this cool thing. Check it out!",
	originalUrl: "https://news.ycombinator.com/item?id=12345",
	crawledAt: "2025-12-31T00:00:00.000Z",
	publishedAt: "2025-12-31T00:00:00.000Z",
	language: "en",
	tags: ["story"],
};

export const mockT24Article: NewsArticle = {
	id: "t24-67890",
	source: "t24",
	originalTitle: "Son Dakika Haber",
	originalContent: "Bu bir haber içeriğidir.",
	originalUrl: "https://t24.com.tr/haber/test",
	crawledAt: "2025-12-31T00:00:00.000Z",
	language: "tr",
};

export const mockTransformedArticle: NewsArticle = {
	...mockHNArticle,
	transformedTitle: "A Cool Project Worth Checking Out",
	transformedContent: "An interesting new project has emerged...",
	thumbnailUrl: "/thumbnails/hackernews-12345.png",
	tags: ["technology", "startup", "innovation"],
};

export const mockArticles: NewsArticle[] = [
	mockHNArticle,
	mockT24Article,
	mockTransformedArticle,
];
