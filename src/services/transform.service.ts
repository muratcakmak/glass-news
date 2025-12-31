import type { Env, NewsArticle, ArticleVariant, TransformVariant } from "../types";
import { transformContent } from "../transformers/content";
import { articleRepository } from "../repositories";

/**
 * Variant-specific prompt styles
 */
const VARIANT_PROMPTS: Record<Exclude<TransformVariant, "raw">, string> = {
	default: "Transform this article into an engaging, informative summary suitable for general readers. Maintain the core message while making it accessible.",
	technical: "Transform this into a technical deep-dive. Focus on implementation details, technical concepts, and insights for experts in the field.",
	casual: "Rewrite this in a friendly, conversational tone. Make it fun and easy to read, like explaining to a friend over coffee.",
	formal: "Present this information in a professional, formal manner suitable for business or academic contexts.",
	brief: "Create an ultra-concise summary. Capture only the most essential points in 2-3 sentences maximum.",
};

/**
 * Service for article transformations with variant support
 */
export class TransformService {
	/**
	 * Transform an article with a specific variant style
	 */
	async transformArticle(
		article: NewsArticle,
		variant: Exclude<TransformVariant, "raw">,
		env: Env,
		style?: "pamuk" | "direct" | "greentext" | "random"
	): Promise<ArticleVariant> {
		console.log(`[TransformService] Transforming ${article.id} with variant: ${variant}, style: ${style || 'default'}`);

		// Transform the content using the variant-specific prompt and optional style
		const transformed = await transformContent(article, env, {
			customPrompt: VARIANT_PROMPTS[variant],
			style
		});

		// Create the variant object
		const articleVariant: ArticleVariant = {
			articleId: article.id,
			source: article.source,
			variant,
			title: transformed.transformedTitle || article.originalTitle,
			content: transformed.transformedContent || article.originalContent,
			thumbnailUrl: transformed.thumbnailUrl,
			tags: transformed.tags,
			metadata: {
				variant,
				model: env.RESEARCH_MODEL || "unknown",
				promptStyle: env.PROMPT_STYLE,
				transformedAt: new Date().toISOString(),
			},
		};

		// Save the variant to R2
		await articleRepository.saveVariant(articleVariant, env);

		console.log(`[TransformService] ✓ Saved variant ${variant} for ${article.id}`);
		return articleVariant;
	}

	/**
	 * Transform an article into multiple variants
	 */
	async transformMultipleVariants(
		article: NewsArticle,
		variants: Exclude<TransformVariant, "raw">[],
		env: Env,
		style?: "pamuk" | "direct" | "greentext" | "random"
	): Promise<ArticleVariant[]> {
		const results: ArticleVariant[] = [];

		for (const variant of variants) {
			try {
				const transformed = await this.transformArticle(article, variant, env, style);
				results.push(transformed);
			} catch (error) {
				console.error(
					`[TransformService] Error transforming ${article.id} with variant ${variant}:`,
					error
				);
			}
		}

		return results;
	}

	/**
	 * Get or create a variant (cache-friendly)
	 */
	async getOrCreateVariant(
		article: NewsArticle,
		variant: TransformVariant,
		env: Env
	): Promise<ArticleVariant> {
		// If requesting raw variant, return article as-is
		if (variant === "raw") {
			return {
				articleId: article.id,
				source: article.source,
				variant: "raw",
				title: article.originalTitle,
				content: article.originalContent,
				thumbnailUrl: article.thumbnailUrl,
				tags: article.tags,
				metadata: {
					variant: "raw",
					model: "none",
					transformedAt: article.crawledAt,
				},
			};
		}

		// Check if variant already exists
		const existing = await articleRepository.getVariant(
			article.id,
			article.source,
			variant,
			env
		);

		if (existing) {
			console.log(`[TransformService] Using cached variant ${variant} for ${article.id}`);
			return existing;
		}

		// Create new variant
		console.log(`[TransformService] Creating new variant ${variant} for ${article.id}`);
		return this.transformArticle(article, variant, env);
	}

	/**
	 * List available variants for an article
	 */
	async listAvailableVariants(
		articleId: string,
		source: string,
		env: Env
	): Promise<TransformVariant[]> {
		const variants = await articleRepository.listVariants(articleId, source, env);
		// Always include 'raw' as available
		return ["raw", ...variants];
	}
}

// Export singleton instance
export const transformService = new TransformService();
