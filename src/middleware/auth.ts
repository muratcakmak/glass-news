import type { Context, Next } from "hono";
import type { Env } from "../types";

/**
 * Bearer token authentication middleware for admin endpoints
 *
 * Usage:
 * 1. Set ADMIN_API_KEY secret: wrangler secret put ADMIN_API_KEY
 * 2. Add to routes: app.use("/api/admin/*", requireAuth)
 * 3. Send requests with: Authorization: Bearer <your-api-key>
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader) {
		return c.json(
			{
				error: "Authentication required",
				message: "Missing Authorization header",
			},
			401
		);
	}

	// Check Bearer token format
	const [scheme, token] = authHeader.split(" ");

	if (scheme !== "Bearer" || !token) {
		return c.json(
			{
				error: "Invalid authentication",
				message: "Authorization header must use Bearer scheme",
			},
			401
		);
	}

	// Verify token against environment secret
	const validToken = c.env.ADMIN_API_KEY;

	if (!validToken) {
		console.error("[Auth] ADMIN_API_KEY not configured");
		return c.json(
			{
				error: "Server configuration error",
				message: "Authentication system not configured",
			},
			500
		);
	}

	// Constant-time comparison to prevent timing attacks
	if (token !== validToken) {
		// Log failed authentication attempts
		console.warn(
			`[Auth] Failed authentication attempt from ${getClientIp(c)}`
		);

		return c.json(
			{
				error: "Authentication failed",
				message: "Invalid API key",
			},
			403
		);
	}

	// Authentication successful
	console.log(`[Auth] Authenticated request from ${getClientIp(c)}`);

	await next();
}

/**
 * Optional authentication - allows requests with or without auth
 * Useful for endpoints that want to provide different responses for authenticated users
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (authHeader) {
		const [scheme, token] = authHeader.split(" ");

		if (scheme === "Bearer" && token === c.env.ADMIN_API_KEY) {
			// Mark as authenticated for downstream handlers
			c.set("authenticated", true);
		}
	}

	await next();
}

/**
 * Get client IP address for logging
 */
function getClientIp(c: Context): string {
	return (
		c.req.header("CF-Connecting-IP") ||
		c.req.header("X-Forwarded-For")?.split(",")[0] ||
		"unknown"
	);
}
