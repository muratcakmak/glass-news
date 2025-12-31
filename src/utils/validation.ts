import { z } from "zod";

/**
 * Article ID sanitization
 * Only allow alphanumeric characters, hyphens, and underscores
 * Prevent path traversal attacks
 */
export function sanitizeArticleId(id: string): string | null {
	// Only allow safe characters
	if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
		return null;
	}

	// Prevent path traversal
	if (id.includes("..") || id.includes("/") || id.includes("\\")) {
		return null;
	}

	// Reasonable length limit
	if (id.length > 100) {
		return null;
	}

	return id;
}

/**
 * Validation schemas for API inputs
 */

// News sources enum
const NewsSourceEnum = z.enum([
	"hackernews",
	"t24",
	"eksisozluk",
	"reddit",
	"wikipedia",
	"webrazzi",
	"bbc",
]);

// Transform variant enum
const TransformVariantEnum = z.enum([
	"default",
	"technical",
	"casual",
	"formal",
	"brief",
]);

/**
 * Crawl request validation schema
 */
export const CrawlRequestSchema = z.object({
	sources: z.array(NewsSourceEnum).optional().default(["hackernews"]),
	count: z.number().int().min(1).max(20).optional().default(5),
	transform: z.boolean().optional().default(false),
	variant: TransformVariantEnum.optional().default("default"),
	sync: z.boolean().optional().default(true),
});

export type CrawlRequest = z.infer<typeof CrawlRequestSchema>;

/**
 * Transform request validation schemas
 */
export const TransformSingleArticleSchema = z.object({
	articleId: z.string().min(1).max(100),
	variant: TransformVariantEnum.optional(),
	variants: z.array(TransformVariantEnum).optional(),
});

export const TransformBatchArticlesSchema = z.object({
	articleIds: z.array(z.string().min(1).max(100)).min(1).max(50),
	variant: TransformVariantEnum.optional(),
	variants: z.array(TransformVariantEnum).optional(),
});

export const TransformBySourceSchema = z.object({
	source: NewsSourceEnum,
	limit: z.number().int().min(1).max(50).optional().default(10),
	variant: TransformVariantEnum.optional(),
	variants: z.array(TransformVariantEnum).optional(),
});

export const TransformRequestSchema = z.union([
	TransformSingleArticleSchema,
	TransformBatchArticlesSchema,
	TransformBySourceSchema,
]);

export type TransformRequest = z.infer<typeof TransformRequestSchema>;

/**
 * Push subscription validation schema
 */
export const PushSubscriptionSchema = z.object({
	endpoint: z.string().url().startsWith("https://"),
	expirationTime: z.number().nullable().optional(),
	keys: z.object({
		p256dh: z.string().regex(/^[A-Za-z0-9_-]+$/),
		auth: z.string().regex(/^[A-Za-z0-9_-]+$/),
	}),
});

export type ValidatedPushSubscription = z.infer<typeof PushSubscriptionSchema>;

/**
 * Test push notification schema
 */
export const TestPushSchema = z.object({
	title: z.string().max(100).optional(),
	message: z.string().max(500).optional(),
});

export type TestPushRequest = z.infer<typeof TestPushSchema>;

/**
 * Query parameter validation
 */
export const ArticleListQuerySchema = z.object({
	source: NewsSourceEnum.optional(),
	limit: z.number().int().min(1).max(100).optional().default(20),
});

export const ArticleVariantQuerySchema = z.object({
	variant: z
		.enum(["raw", "default", "technical", "casual", "formal", "brief"])
		.optional()
		.default("raw"),
});

/**
 * Validation helper for safe error responses
 */
export function formatValidationError(error: z.ZodError): {
	error: string;
	details: string[];
} {
	return {
		error: "Validation failed",
		details: error.issues.map(
			(issue) => `${issue.path.join(".")}: ${issue.message}`
		),
	};
}
