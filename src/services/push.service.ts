import type { Env, NewsArticle } from "../types";
import webpush from "web-push";
import { VAPID_PUBLIC_KEY, PUSH_TTL } from "../config/constants";
import { subscriptionRepository, type PushSubscription } from "../repositories";

export interface PushResult {
	sent: number;
	failed: number;
	errors: any[];
}

/**
 * Service for push notifications
 */
export class PushService {
	/**
	 * Subscribe a client to push notifications
	 */
	async subscribe(subscription: PushSubscription, env: Env): Promise<void> {
		await subscriptionRepository.save(subscription, env);
		console.log(`[PushService] Subscribed user`);
	}

	/**
	 * Get subscription count
	 */
	async getSubscriptionCount(env: Env): Promise<number> {
		return subscriptionRepository.count(env);
	}

	/**
	 * Send push notification to all subscribers
	 */
	async sendNotifications(articles: NewsArticle[], env: Env): Promise<void> {
		if (articles.length === 0) {
			console.log("[PushService] No articles to notify about");
			return;
		}

		console.log(
			`[PushService] Sending notifications for ${articles.length} articles...`,
		);

		// Configure VAPID
		webpush.setVapidDetails(
			env.VAPID_SUBJECT,
			VAPID_PUBLIC_KEY,
			env.VAPID_PRIVATE_KEY,
		);

		const keys = await subscriptionRepository.getKeys(env);
		console.log(`[PushService] Found ${keys.length} subscriptions`);

		if (keys.length === 0) return;

		// Create notification payload
		const firstArticle = articles[0]!;
		const articleTitle =
			firstArticle.transformedTitle || firstArticle.originalTitle;

		const notification = {
			title: "New Articles Available",
			body: `${articles.length} new stories added. Top: ${articleTitle}`,
			url: `/?article=${firstArticle.id}`,
			icon: "/icons/icon-192.png",
			badge: "/icons/badge-72.png",
		};

		const payload = JSON.stringify(notification);

		// Send pushes in parallel
		await Promise.allSettled(
			keys.map((key) => this.sendPush(key, payload, env)),
		);

		console.log(`[PushService] ✓ Notifications sent`);
	}

	/**
	 * Send test push notification
	 */
	async sendTestNotification(
		title: string,
		message: string,
		env: Env,
	): Promise<PushResult> {
		console.log(`[PushService] Sending test push: ${title}`);

		webpush.setVapidDetails(
			env.VAPID_SUBJECT,
			VAPID_PUBLIC_KEY,
			env.VAPID_PRIVATE_KEY,
		);

		const keys = await subscriptionRepository.getKeys(env);

		const notification = {
			title,
			body: message,
			url: "/?test=true",
			icon: "/icons/icon-192.png",
			badge: "/icons/badge-72.png",
		};

		const payload = JSON.stringify(notification);

		let sent = 0;
		let failed = 0;
		const errors: any[] = [];

		const results = await Promise.allSettled(
			keys.map((key) => this.sendPush(key, payload, env)),
		);

		for (const result of results) {
			if (result.status === "fulfilled" && result.value === true) {
				sent++;
			} else {
				failed++;
				if (result.status === "rejected") {
					errors.push(result.reason);
				}
			}
		}

		return { sent, failed, errors };
	}

	/**
	 * Send push to a single subscription
	 */
	private async sendPush(
		key: string,
		payload: string,
		env: Env,
	): Promise<boolean> {
		try {
			const subscription = await subscriptionRepository.findByKey(key, env);
			if (!subscription) return false;

			const options = {
				vapidDetails: {
					subject: env.VAPID_SUBJECT,
					publicKey: VAPID_PUBLIC_KEY,
					privateKey: env.VAPID_PRIVATE_KEY,
				},
				TTL: PUSH_TTL,
			};

			// @ts-ignore - webpush types might be incomplete
			const details = await webpush.generateRequestDetails(
				subscription,
				payload,
				options,
			);

			const response = await fetch(details.endpoint, {
				method: "POST",
				headers: details.headers,
				body: details.body,
			});

			if (!response.ok) {
				if (response.status === 410 || response.status === 404) {
					// Subscription expired, delete it
					await subscriptionRepository.delete(key, env);
					console.log(`[PushService] Deleted expired subscription: ${key}`);
				}
				return false;
			}

			return true;
		} catch (error) {
			console.error(`[PushService] Error sending push to ${key}:`, error);
			return false;
		}
	}
}

// Export singleton instance
export const pushService = new PushService();
