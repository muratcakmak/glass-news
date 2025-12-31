import type { NewsArticle } from "../types";

/**
 * Validation utilities
 */

/**
 * Validate that a value is a positive integer
 */
export function isPositiveInteger(value: any): value is number {
	return (
		typeof value === "number" && Number.isInteger(value) && value > 0
	);
}

/**
 * Validate that a value is a valid URL
 */
export function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validate that a value is a valid news source
 */
export function isValidSource(
	value: string
): value is NewsArticle["source"] {
	const validSources = [
		"hackernews",
		"t24",
		"eksisozluk",
		"reddit",
		"wikipedia",
		"webrazzi",
		"bbc",
	];
	return validSources.includes(value);
}

/**
 * Validate that a NewsArticle has all required fields
 */
export function isValidArticle(article: any): article is NewsArticle {
	return (
		article &&
		typeof article === "object" &&
		typeof article.id === "string" &&
		typeof article.source === "string" &&
		typeof article.originalTitle === "string" &&
		typeof article.originalContent === "string" &&
		typeof article.originalUrl === "string" &&
		typeof article.crawledAt === "string" &&
		(article.language === "tr" || article.language === "en")
	);
}

/**
 * Sanitize a string by removing HTML tags and trimming
 */
export function sanitizeString(value: string): string {
	return value.replace(/<[^>]+>/g, "").trim();
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return value.substring(0, maxLength - 3) + "...";
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit?: string, offset?: string): {
	limit: number;
	offset: number;
	valid: boolean;
	error?: string;
} {
	const parsedLimit = limit ? parseInt(limit) : 20;
	const parsedOffset = offset ? parseInt(offset) : 0;

	if (!isPositiveInteger(parsedLimit) || parsedLimit > 100) {
		return {
			limit: 20,
			offset: 0,
			valid: false,
			error: "Limit must be a positive integer between 1 and 100",
		};
	}

	if (parsedOffset < 0) {
		return {
			limit: parsedLimit,
			offset: 0,
			valid: false,
			error: "Offset must be a non-negative integer",
		};
	}

	return {
		limit: parsedLimit,
		offset: parsedOffset,
		valid: true,
	};
}
