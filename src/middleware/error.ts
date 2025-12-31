import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Global error handler middleware
 * SECURITY: Does not leak sensitive information in production
 */
export async function errorHandler(c: Context, next: () => Promise<void>) {
	try {
		await next();
	} catch (error) {
		// Always log full error server-side for debugging
		console.error("[ErrorHandler] Unhandled error:", error);

		// Check if running in development mode
		const isDevelopment = c.env?.ENVIRONMENT === "development";

		// Handle Hono HTTP exceptions (these are intentional)
		if (error instanceof HTTPException) {
			return c.json(
				{
					error: error.message,
					status: error.status,
				},
				error.status as any
			);
		}

		// Handle standard errors
		if (error instanceof Error) {
			// In production: hide error details to prevent info leakage
			// In development: show full error for debugging
			return c.json(
				{
					error: isDevelopment ? error.message : "Internal server error",
					status: 500,
					// Only include stack trace in development
					...(isDevelopment && { stack: error.stack }),
				},
				500
			);
		}

		// Handle unknown errors - never leak details
		return c.json(
			{
				error: "Internal server error",
				status: 500,
			},
			500
		);
	}
}
