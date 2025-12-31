import type { Context, Next } from "hono";

/**
 * Security headers middleware
 * Adds security-related HTTP headers to all responses
 */
export async function securityHeaders(c: Context, next: Next) {
	await next();

	// Prevent MIME type sniffing
	c.header("X-Content-Type-Options", "nosniff");

	// Prevent clickjacking
	c.header("X-Frame-Options", "DENY");

	// Enable XSS filter in older browsers
	c.header("X-XSS-Protection", "1; mode=block");

	// Control referrer information
	c.header("Referrer-Policy", "strict-origin-when-cross-origin");

	// Disable unnecessary browser features
	c.header(
		"Permissions-Policy",
		"geolocation=(), microphone=(), camera=(), payment=()"
	);

	// Content Security Policy for JSON API
	c.header(
		"Content-Security-Policy",
		"default-src 'none'; frame-ancestors 'none'"
	);

	// Strict Transport Security (HSTS) - force HTTPS
	c.header(
		"Strict-Transport-Security",
		"max-age=31536000; includeSubDomains; preload"
	);
}

/**
 * Request body size limit middleware
 * Prevents memory exhaustion from large payloads
 */
export function bodySizeLimit(maxBytes: number = 1024 * 1024) {
	// 1MB default
	return async (c: Context, next: Next) => {
		const contentLength = c.req.header("Content-Length");

		if (contentLength && parseInt(contentLength) > maxBytes) {
			return c.json(
				{
					error: "Request too large",
					message: `Maximum request size is ${maxBytes} bytes`,
				},
				413
			);
		}

		await next();
	};
}

/**
 * HTTPS enforcement middleware
 * Ensures requests are coming over HTTPS
 */
export async function httpsOnly(c: Context, next: Next) {
	const protocol = c.req.header("X-Forwarded-Proto") || "https";

	// Allow HTTP in development
	const isDevelopment = c.env?.ENVIRONMENT === "development";

	if (protocol !== "https" && !isDevelopment) {
		return c.json(
			{
				error: "HTTPS required",
				message: "This API only accepts HTTPS requests",
			},
			403
		);
	}

	await next();
}
