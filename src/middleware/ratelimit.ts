import type { Context, Next } from "hono";
import type { Env } from "../types";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Max requests per window
	keyPrefix: string; // KV key prefix
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
	// Admin endpoints - strict limits
	ADMIN: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 10,
		keyPrefix: "ratelimit:admin:",
	} as RateLimitConfig,

	// AI transformation - expensive operation
	TRANSFORM: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 5,
		keyPrefix: "ratelimit:transform:",
	} as RateLimitConfig,

	// Read operations - more permissive
	READ: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 60,
		keyPrefix: "ratelimit:read:",
	} as RateLimitConfig,

	// Public endpoints - most permissive
	PUBLIC: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 100,
		keyPrefix: "ratelimit:public:",
	} as RateLimitConfig,
};

/**
 * Get client identifier (IP address or Cloudflare connecting IP)
 */
function getClientId(c: Context): string {
	// Try to get real IP from Cloudflare headers
	const cfConnectingIp = c.req.header("CF-Connecting-IP");
	const xForwardedFor = c.req.header("X-Forwarded-For");
	const xRealIp = c.req.header("X-Real-IP");

	return cfConnectingIp || xForwardedFor?.split(",")[0] || xRealIp || "unknown";
}

/**
 * Rate limiting middleware using Cloudflare Workers KV
 */
export function rateLimiter(config: RateLimitConfig) {
	return async (c: Context<{ Bindings: Env }>, next: Next) => {
		const env = c.env;
		const clientId = getClientId(c);
		const key = `${config.keyPrefix}${clientId}`;
		const now = Date.now();

		try {
			// Get current rate limit data from KV
			const dataStr = await env.NEWS_KV.get(key);
			let data: { count: number; resetAt: number } = dataStr
				? JSON.parse(dataStr)
				: { count: 0, resetAt: now + config.windowMs };

			// Reset if window has expired
			if (now > data.resetAt) {
				data = { count: 0, resetAt: now + config.windowMs };
			}

			// Check if limit exceeded
			if (data.count >= config.maxRequests) {
				const resetIn = Math.ceil((data.resetAt - now) / 1000);

				return c.json(
					{
						error: "Rate limit exceeded",
						message: `Too many requests. Please try again in ${resetIn} seconds.`,
						retryAfter: resetIn,
					},
					429,
					{
						"Retry-After": resetIn.toString(),
						"X-RateLimit-Limit": config.maxRequests.toString(),
						"X-RateLimit-Remaining": "0",
						"X-RateLimit-Reset": data.resetAt.toString(),
					}
				);
			}

			// Increment count
			data.count++;

			// Save to KV with TTL
			const ttlSeconds = Math.ceil(config.windowMs / 1000) + 10; // Add 10s buffer
			await env.NEWS_KV.put(key, JSON.stringify(data), {
				expirationTtl: ttlSeconds,
			});

			// Add rate limit headers
			c.header("X-RateLimit-Limit", config.maxRequests.toString());
			c.header(
				"X-RateLimit-Remaining",
				(config.maxRequests - data.count).toString()
			);
			c.header("X-RateLimit-Reset", data.resetAt.toString());

			await next();
		} catch (error) {
			console.error("[RateLimit] Error:", error);
			// On error, allow the request (fail open)
			await next();
		}
	};
}

/**
 * Convenience middleware creators
 */
export const adminRateLimit = () => rateLimiter(RATE_LIMITS.ADMIN);
export const transformRateLimit = () => rateLimiter(RATE_LIMITS.TRANSFORM);
export const readRateLimit = () => rateLimiter(RATE_LIMITS.READ);
export const publicRateLimit = () => rateLimiter(RATE_LIMITS.PUBLIC);
