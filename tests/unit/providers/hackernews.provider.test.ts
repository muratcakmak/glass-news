import { describe, it, expect, beforeEach } from "bun:test";
import { HackerNewsProvider } from "../../../src/providers/hackernews.provider";
import type { Env } from "../../../src/types";

describe("HackerNewsProvider", () => {
	let provider: HackerNewsProvider;
	let mockEnv: Env;

	beforeEach(() => {
		provider = new HackerNewsProvider();
		mockEnv = {} as Env;
	});

	it("should have correct configuration", () => {
		expect(provider.config.id).toBe("hackernews");
		expect(provider.config.name).toBe("Hacker News");
		expect(provider.config.enabled).toBe(true);
		expect(provider.config.language).toBe("en");
	});

	it("should be able to run without special configuration", () => {
		expect(provider.canRun(mockEnv)).toBe(true);
	});

	it("should crawl articles", async () => {
		const articles = await provider.crawl(5, mockEnv);

		expect(Array.isArray(articles)).toBe(true);
		expect(articles.length).toBeGreaterThan(0);
		expect(articles.length).toBeLessThanOrEqual(5);

		// Check first article structure
		const firstArticle = articles[0];
		if (firstArticle) {
			expect(firstArticle.id).toContain("hackernews-");
			expect(firstArticle.source).toBe("hackernews");
			expect(firstArticle.originalTitle).toBeTruthy();
			expect(firstArticle.language).toBe("en");
		}
	});

	it("should generate consistent IDs", async () => {
		const articles = await provider.crawl(2, mockEnv);

		for (const article of articles) {
			expect(article.id).toMatch(/^hackernews-\d+$/);
		}
	});
});
