import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Global error handler middleware
 */
export async function errorHandler(c: Context, next: () => Promise<void>) {
	try {
		await next();
	} catch (error) {
		console.error("[ErrorHandler] Unhandled error:", error);

		// Handle Hono HTTP exceptions
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
			return c.json(
				{
					error: error.message || "Internal server error",
					status: 500,
				},
				500
			);
		}

		// Handle unknown errors
		return c.json(
			{
				error: "An unknown error occurred",
				status: 500,
			},
			500
		);
	}
}
