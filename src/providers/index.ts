/**
 * Provider Registry
 * Import and register all news providers here
 *
 * To add a new provider:
 * 1. Create a new provider class extending BaseProvider
 * 2. Import it here
 * 3. Add it to the registerAllProviders() function
 *
 * To disable a provider:
 * - Set enabled: false in its config
 * - Or comment out the registration line
 */

import { registry } from "../lib/provider-registry";
import { HackerNewsProvider } from "./hackernews.provider";
import { T24Provider } from "./t24.provider";
import { EksisozlukProvider } from "./eksisozluk.provider";
import { RedditProvider } from "./reddit.provider";
import { WikipediaProvider } from "./wikipedia.provider";

/**
 * Register all news providers
 * This function is called once at startup
 */
export function registerAllProviders(): void {
	// Register each provider
	registry.register(new HackerNewsProvider());
	registry.register(new T24Provider());
	registry.register(new EksisozlukProvider());
	registry.register(new RedditProvider());
	registry.register(new WikipediaProvider());

	console.log(`[Providers] Registered ${registry.count()} providers:`, registry.listProviderIds());
}

// Export the registry for use in services
export { registry } from "../lib/provider-registry";

// Export provider classes for testing
export { HackerNewsProvider } from "./hackernews.provider";
export { T24Provider } from "./t24.provider";
export { EksisozlukProvider } from "./eksisozluk.provider";
export { RedditProvider } from "./reddit.provider";
export { WikipediaProvider } from "./wikipedia.provider";
export { BaseProvider } from "./base.provider";
