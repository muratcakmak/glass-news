import { generateThumbnail } from "./src/transformers/thumbnail";
import { NewsArticle } from "./src/types";

const mockEnv = {
	GEMINI_API_KEY: process.env.GEMINI_API_KEY || "test-key",
	NEWS_BUCKET: {} as any,
	NEWS_KV: {} as any,
};

const mockArticle: NewsArticle = {
	id: "test-123",
	source: "hackernews",
	originalTitle: "Apple Reveals New Glass Technology",
	originalContent:
		"Apple has announced a new type of liquid glass that is both durable and flexible.",
	originalUrl: "https://example.com",
	crawledAt: new Date().toISOString(),
	language: "en",
};

async function test() {
	console.log("Testing Gemini Image Generation...");
	if (mockEnv.GEMINI_API_KEY === "test-key") {
		console.warn(
			"⚠️  GEMINI_API_KEY not set in environment. Use GEMINI_API_KEY=... bun run test-gemini.ts",
		);
	}

	try {
		const result = await generateThumbnail(mockArticle, mockEnv);
		if (result) {
			console.log("✅ Generated Blob size:", result.size);
			console.log("✅ Content Type:", result.type);
		} else {
			console.log("❌ Generation failed or returned null");
		}
	} catch (e) {
		console.error("❌ Error:", e);
	}
}

test();
