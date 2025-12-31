import { Context, Next } from "hono";
import { cors as honoCors } from "hono/cors";

/**
 * CORS middleware configuration
 * Allows all origins for public API access
 */
export const corsMiddleware = honoCors({
	origin: "*",
	allowMethods: ["GET", "POST", "OPTIONS"],
	allowHeaders: ["Content-Type"],
	exposeHeaders: ["Content-Length"],
	maxAge: 600,
	credentials: false,
});
