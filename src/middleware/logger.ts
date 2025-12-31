import { Context, Next } from "hono";

/**
 * Request logging middleware
 * Logs all incoming requests with timing information
 */
export async function requestLogger(c: Context, next: Next) {
	const start = Date.now();
	const { method, url } = c.req;

	await next();

	const duration = Date.now() - start;
	const status = c.res.status;

	console.log(`[${method}] ${url} - ${status} (${duration}ms)`);
}
