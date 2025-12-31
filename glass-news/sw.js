/**
 * Glass News PWA - Service Worker
 * Handles caching, offline support, and push notifications
 */

const CACHE_NAME = "glass-news-v2.3.0";
const OFFLINE_URL = "offline.html";

// Assets to cache on install
const PRECACHE_ASSETS = [
	"/",
	"/index.html",
	"/styles.css",
	"/app.js",
	"/manifest.json",
	"/offline.html",
	"/icons/icon-192.svg",
	"/icons/icon-512.svg",
	"/icons/favicon.svg",
];

// =========================================
// Install Event
// =========================================

self.addEventListener("install", (event) => {
	console.log("[SW] Installing service worker...");

	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				console.log("[SW] Caching app shell...");
				return cache.addAll(PRECACHE_ASSETS);
			})
			.then(() => {
				// Force the waiting service worker to become active
				return self.skipWaiting();
			}),
	);
});

// =========================================
// Activate Event
// =========================================

self.addEventListener("activate", (event) => {
	console.log("[SW] Activating service worker...");

	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => name !== CACHE_NAME)
						.map((name) => {
							console.log("[SW] Deleting old cache:", name);
							return caches.delete(name);
						}),
				);
			})
			.then(() => {
				// Take control of all pages immediately
				return self.clients.claim();
			}),
	);
});

// =========================================
// Fetch Event - Network First with Cache Fallback
// =========================================

self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== "GET") return;

	// Skip chrome-extension and other non-http(s) requests
	if (!url.protocol.startsWith("http")) return;

	// For navigation requests (HTML pages)
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(() => {
				return caches.match(OFFLINE_URL);
			}),
		);
		return;
	}

	// For API requests - Network first, then cache
	if (url.pathname.includes("/api/")) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Clone the response before caching
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone);
					});
					return response;
				})
				.catch(() => {
					return caches.match(request);
				}),
		);
		return;
	}

	// For images - Cache first, then network
	if (request.destination === "image") {
		event.respondWith(
			caches.match(request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse;
				}

				return fetch(request).then((response) => {
					// Don't cache if not a valid response
					if (!response || response.status !== 200) {
						return response;
					}

					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone);
					});

					return response;
				});
			}),
		);
		return;
	}

	// For core app files (JS/CSS) - Network First to avoid stale UI
	if (request.destination === "script" || request.destination === "style") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone);
					});
					return response;
				})
				.catch(() => caches.match(request)),
		);
		return;
	}

	// For other static assets - Cache first, then network
	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			if (cachedResponse) {
				// Return cached version and update in background
				fetch(request).then((response) => {
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, response);
					});
				});
				return cachedResponse;
			}

			return fetch(request).then((response) => {
				// Don't cache if not a valid response
				if (!response || response.status !== 200) {
					return response;
				}

				const responseClone = response.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(request, responseClone);
				});

				return response;
			});
		}),
	);
});

// =========================================
// Push Notification Event
// =========================================

self.addEventListener("push", (event) => {
	console.log("[SW] Push notification received");

	let data = {
		title: "Glass News",
		body: "You have a new notification",
		icon: "/icons/icon-192.png",
		badge: "/icons/badge-72.png",
		url: "/",
	};

	// Parse push data if available
	if (event.data) {
		try {
			data = { ...data, ...event.data.json() };
		} catch (e) {
			data.body = event.data.text();
		}
	}

	const options = {
		body: data.body,
		icon: data.icon,
		badge: data.badge,
		vibrate: [100, 50, 100],
		data: {
			url: data.url || "/",
		},
		actions: [
			{
				action: "open",
				title: "Read More",
			},
			{
				action: "close",
				title: "Dismiss",
			},
		],
		tag: data.tag || "default",
		renotify: true,
		requireInteraction: false,
	};

	event.waitUntil(self.registration.showNotification(data.title, options));
});

// =========================================
// Notification Click Event
// =========================================

self.addEventListener("notificationclick", (event) => {
	console.log("[SW] Notification clicked");

	event.notification.close();

	// Handle action buttons
	if (event.action === "close") {
		return;
	}

	// Get the URL to open
	const urlToOpen = event.notification.data?.url || "/";

	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((windowClients) => {
				// Check if there's already a window open
				for (const client of windowClients) {
					if (client.url.includes(self.location.origin) && "focus" in client) {
						client.navigate(urlToOpen);
						return client.focus();
					}
				}

				// Open new window if none exists
				if (clients.openWindow) {
					return clients.openWindow(urlToOpen);
				}
			}),
	);
});

// =========================================
// Notification Close Event
// =========================================

self.addEventListener("notificationclose", (event) => {
	console.log("[SW] Notification closed");
	// You could track analytics here
});

// =========================================
// Background Sync (for offline form submissions)
// =========================================

self.addEventListener("sync", (event) => {
	console.log("[SW] Background sync:", event.tag);

	if (event.tag === "sync-news") {
		event.waitUntil(
			// Sync news data when back online
			fetch("/api/news")
				.then((response) => response.json())
				.then((data) => {
					// Update cache with fresh data
					return caches.open(CACHE_NAME).then((cache) => {
						return cache.put("/api/news", new Response(JSON.stringify(data)));
					});
				}),
		);
	}
});

// =========================================
// Periodic Background Sync (if supported)
// =========================================

self.addEventListener("periodicsync", (event) => {
	console.log("[SW] Periodic sync:", event.tag);

	if (event.tag === "news-update") {
		event.waitUntil(
			fetch("/api/news")
				.then((response) => response.json())
				.then((data) => {
					// Check for new articles and notify
					// This would compare with cached data in a real app
					if (data.hasNew) {
						return self.registration.showNotification(
							"New Glass News Available",
							{
								body: "Check out the latest stories",
								icon: "/icons/icon-192.png",
								badge: "/icons/badge-72.png",
							},
						);
					}
				}),
		);
	}
});

// =========================================
// Message Handler (communication with main app)
// =========================================

self.addEventListener("message", (event) => {
	console.log("[SW] Message received:", event.data);

	if (event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}

	if (event.data.type === "CACHE_URLS") {
		event.waitUntil(
			caches.open(CACHE_NAME).then((cache) => {
				return cache.addAll(event.data.urls);
			}),
		);
	}
});
