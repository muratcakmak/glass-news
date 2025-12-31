import type { Env } from "../types";

export interface PushSubscription {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

/**
 * Repository for managing push notification subscriptions in KV
 */
export class SubscriptionRepository {
	/**
	 * Save a push subscription
	 */
	async save(subscription: PushSubscription, env: Env): Promise<void> {
		// Use endpoint as unique ID
		const id = btoa(subscription.endpoint).substring(0, 32);
		await env.NEWS_KV.put(`sub:${id}`, JSON.stringify(subscription));
		console.log(`[SubscriptionRepo] Saved subscription: ${id}`);
	}

	/**
	 * Get all subscriptions
	 */
	async findAll(env: Env): Promise<PushSubscription[]> {
		const { keys } = await env.NEWS_KV.list({ prefix: "sub:" });
		const subscriptions: PushSubscription[] = [];

		for (const key of keys) {
			const data = await env.NEWS_KV.get(key.name);
			if (data) {
				try {
					subscriptions.push(JSON.parse(data));
				} catch (error) {
					console.error(
						`[SubscriptionRepo] Error parsing subscription ${key.name}:`,
						error
					);
				}
			}
		}

		return subscriptions;
	}

	/**
	 * Get a subscription by key
	 */
	async findByKey(key: string, env: Env): Promise<PushSubscription | null> {
		const data = await env.NEWS_KV.get(key);
		if (!data) return null;

		try {
			return JSON.parse(data);
		} catch (error) {
			console.error(
				`[SubscriptionRepo] Error parsing subscription ${key}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Delete a subscription
	 */
	async delete(key: string, env: Env): Promise<void> {
		await env.NEWS_KV.delete(key);
		console.log(`[SubscriptionRepo] Deleted subscription: ${key}`);
	}

	/**
	 * Get subscription count
	 */
	async count(env: Env): Promise<number> {
		const { keys } = await env.NEWS_KV.list({ prefix: "sub:" });
		return keys.length;
	}

	/**
	 * Get all subscription keys
	 */
	async getKeys(env: Env): Promise<string[]> {
		const { keys } = await env.NEWS_KV.list({ prefix: "sub:" });
		return keys.map((k) => k.name);
	}
}

// Export singleton instance
export const subscriptionRepository = new SubscriptionRepository();
