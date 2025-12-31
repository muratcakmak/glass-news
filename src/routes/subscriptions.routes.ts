import { Hono } from "hono";
import type { Env } from "../types";
import { pushService } from "../services";

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/subscriptions
 * Subscribe to push notifications
 */
app.post("/", async (c) => {
	try {
		const subscription = await c.req.json();
		await pushService.subscribe(subscription, c.env);

		return c.json({ success: true });
	} catch (error) {
		console.error("[Subscriptions API] Error subscribing:", error);
		return c.json({ error: "Failed to subscribe" }, 500);
	}
});

/**
 * GET /api/subscriptions/count
 * Get subscription count (debug endpoint)
 */
app.get("/count", async (c) => {
	try {
		const count = await pushService.getSubscriptionCount(c.env);
		return c.json({ count });
	} catch (error) {
		console.error("[Subscriptions API] Error getting count:", error);
		return c.json({ error: "Failed to get count" }, 500);
	}
});

/**
 * POST /api/subscriptions/test
 * Send test push notification
 */
app.post("/test", async (c) => {
	try {
		const body = await c.req.json<{ title?: string; message?: string }>();
		const title = body.title || "Test Notification";
		const message = body.message || "This is a test push notification.";

		const result = await pushService.sendTestNotification(title, message, c.env);

		return c.json({
			success: true,
			...result,
		});
	} catch (error) {
		console.error("[Subscriptions API] Error sending test push:", error);
		return c.json({ error: "Failed to send test push" }, 500);
	}
});

export default app;
