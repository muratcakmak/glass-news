import { describe, it, expect } from "bun:test";
import {
	isPositiveInteger,
	isValidUrl,
	isValidSource,
	sanitizeString,
	truncate,
	validatePagination,
} from "../../../src/utils/validators";

describe("Validators", () => {
	describe("isPositiveInteger", () => {
		it("should validate positive integers", () => {
			expect(isPositiveInteger(1)).toBe(true);
			expect(isPositiveInteger(100)).toBe(true);
			expect(isPositiveInteger(0)).toBe(false);
			expect(isPositiveInteger(-1)).toBe(false);
			expect(isPositiveInteger(1.5)).toBe(false);
			expect(isPositiveInteger("1")).toBe(false);
		});
	});

	describe("isValidUrl", () => {
		it("should validate URLs", () => {
			expect(isValidUrl("https://example.com")).toBe(true);
			expect(isValidUrl("http://localhost:8787")).toBe(true);
			expect(isValidUrl("not-a-url")).toBe(false);
			expect(isValidUrl("")).toBe(false);
		});
	});

	describe("isValidSource", () => {
		it("should validate news sources", () => {
			expect(isValidSource("hackernews")).toBe(true);
			expect(isValidSource("t24")).toBe(true);
			expect(isValidSource("invalid")).toBe(false);
		});
	});

	describe("sanitizeString", () => {
		it("should remove HTML tags", () => {
			expect(sanitizeString("<p>Hello</p>")).toBe("Hello");
			expect(sanitizeString("  <b>World</b>  ")).toBe("World");
			expect(sanitizeString("No tags")).toBe("No tags");
		});
	});

	describe("truncate", () => {
		it("should truncate long strings", () => {
			expect(truncate("Hello World", 8)).toBe("Hello...");
			expect(truncate("Short", 10)).toBe("Short");
		});
	});

	describe("validatePagination", () => {
		it("should validate pagination parameters", () => {
			const valid = validatePagination("10", "0");
			expect(valid.valid).toBe(true);
			expect(valid.limit).toBe(10);
			expect(valid.offset).toBe(0);

			const invalid = validatePagination("200", "0");
			expect(invalid.valid).toBe(false);
			expect(invalid.error).toBeTruthy();
		});
	});
});
