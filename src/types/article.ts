/**
 * Transformation variant styles
 */
export type TransformVariant = "raw" | "default" | "technical" | "casual" | "formal" | "brief";

/**
 * Represents a news article from any source (raw/original data)
 */
export interface NewsArticle {
	id: string;
	source: "t24" | "eksisozluk" | "hackernews" | "wikipedia" | "reddit" | "webrazzi" | "bbc";
	originalTitle: string;
	originalContent: string;
	originalUrl: string;
	transformedTitle?: string; // Deprecated: use variants instead
	transformedContent?: string; // Deprecated: use variants instead
	thumbnailUrl?: string;
	tags?: string[];
	crawledAt: string;
	publishedAt?: string;
	language: "tr" | "en";
}

/**
 * Transformation metadata
 */
export interface TransformMetadata {
	variant: TransformVariant;
	model: string;
	promptStyle?: string;
	transformedAt: string;
	tokenUsage?: {
		input: number;
		output: number;
	};
}

/**
 * Transformed article variant
 */
export interface ArticleVariant {
	articleId: string;
	source: string;
	variant: TransformVariant;
	title: string;
	content: string;
	thumbnailUrl?: string;
	tags?: string[];
	metadata: TransformMetadata;
}
