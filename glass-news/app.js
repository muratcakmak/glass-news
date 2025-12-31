/**
 * Glass News PWA - Main Application
 * Features: Local notifications, offline support, dynamic content
 */

// =========================================
// API Configuration
// =========================================

const API_URL = "https://news-data.omc345.workers.dev";
const APP_VERSION = "2.2.8-light-theme-fix";
const VAPID_PUBLIC_KEY =
	"BIxjCPXkLoit-hiaK21vupJXRhxqaksULZ6l-hheRdLLwLPcveNMYKizT64rKbqzZdRxSKcI3QXvSAR8dXmcpTM";
let NEWS_DATA = [];
let VERSION_INFO = { version: APP_VERSION, buildTime: null };
const FALLBACK_IMAGE = "icons/icon-512.svg";
const FALLBACK_TITLE = "Untitled story";
const FALLBACK_EXCERPT = "Read the full story for details.";

// =========================================
// Native Feel Optimizations (iOS)
// =========================================

// 1. Disabling Pinch-to-Zoom (Robust)
document.addEventListener(
	"touchmove",
	function (event) {
		// Only prevent default if it's a multi-touch (pinch) attempt
		if (event.scale !== undefined && event.scale !== 1) {
			event.preventDefault();
		}
	},
	{ passive: false },
);

// 2. Disabling Double-Tap-to-Zoom (Robust)
// Tracks the time between touches to detect double-taps
let lastTouchEnd = 0;
document.addEventListener(
	"touchend",
	function (event) {
		const now = new Date().getTime();
		if (now - lastTouchEnd <= 300) {
			// Only prevent if not in a scrollable element or if explicitly needed
			// For now, let's keep it but ensure it's not swallowing all taps
			// event.preventDefault(); // Removed to ensure taps always work
		}
		lastTouchEnd = now;
	},
	{ passive: true },
);

// 3. Fallback: Disabling Gestures (Pinch)
// This catches some edge cases where touchmove doesn't fire immediately
document.addEventListener(
	"gesturestart",
	function (event) {
		event.preventDefault();
	},
	{ passive: false },
);

document.addEventListener(
	"gesturechange",
	function (event) {
		event.preventDefault();
	},
	{ passive: false },
);

document.addEventListener(
	"gestureend",
	function (event) {
		event.preventDefault();
	},
	{ passive: false },
);

// 4. Prevent touchmove scrolling if scale is not 1 (Nuclear option)
// If the user somehow manages to zoom in, this prevents them from panning around
window.visualViewport?.addEventListener("resize", () => {
	if (window.visualViewport.scale > 1) {
		document.documentElement.style.transform = "scale(1)";
	}
	// Scroll reset for keyboard/accessibility shifts
	if (window.visualViewport.offsetTop > 0) {
		document.body.style.position = "fixed";
		document.body.style.top = "0";
		setTimeout(() => {
			document.body.style.position = "";
		}, 100);
	}
});

/**
 * Fetch articles from API
 */
async function fetchArticles(source = null, limit = 50) {
	try {
		const url = source
			? `${API_URL}/api/articles?source=${source}&limit=${limit}`
			: `${API_URL}/api/articles?limit=${limit}`;

		const response = await fetchWithTimeout(url, 12000);

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const data = await response.json();
		return data.articles || [];
	} catch (error) {
		console.error("Error fetching articles:", error);
		showToast("Failed to load articles", "error");
		return [];
	}
}

function fetchWithTimeout(url, timeoutMs = 10000) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	return fetch(url, { signal: controller.signal }).finally(() => {
		clearTimeout(timeoutId);
	});
}

function normalizeText(value, fallback = "") {
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed) return trimmed;
	}
	return fallback;
}

function ensureArray(value) {
	return Array.isArray(value) ? value : [];
}

function getExcerpt(content) {
	if (!content) return FALLBACK_EXCERPT;
	return content.substring(0, 200) + "...";
}

function setImageWithFallback(imgEl, src, alt) {
	if (!imgEl) return;
	imgEl.alt = alt || "";
	imgEl.loading = imgEl.loading || "lazy";
	imgEl.decoding = "async";
	imgEl.onerror = () => {
		imgEl.src = FALLBACK_IMAGE;
		imgEl.onerror = null;
	};
	imgEl.src = src || FALLBACK_IMAGE;
}

/**
 * Transform API article to UI format
 */
function transformArticle(apiArticle) {
	const getTimeAgo = (crawledAt) => {
		const now = new Date();
		const crawled = new Date(crawledAt);
		const diffMs = now - crawled;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffDays > 0) return `${diffDays}d ago`;
		if (diffHours > 0) return `${diffHours}h ago`;
		if (diffMins > 0) return `${diffMins}m ago`;
		return "Just now";
	};

	const getReadTime = (content) => {
		if (!content) return "3 min";
		const words = content.split(" ").length;
		const mins = Math.ceil(words / 200);
		return `${mins} min`;
	};

	const getCategoryName = (source) => {
		const map = {
			hackernews: "Tech",
			wikipedia: "News",
			reddit: "Community",
			t24: "News",
			eksisozluk: "Life",
		};
		return map[source] || source;
	};

	const originalContent = normalizeText(apiArticle.originalContent);
	const transformedContent = normalizeText(apiArticle.transformedContent);
	const fullContent = transformedContent || originalContent || "";
	const title = normalizeText(
		apiArticle.transformedTitle || apiArticle.originalTitle,
		FALLBACK_TITLE,
	);

	let imageUrl = FALLBACK_IMAGE;
	if (typeof apiArticle.thumbnailUrl === "string") {
		imageUrl = apiArticle.thumbnailUrl.startsWith("http")
			? apiArticle.thumbnailUrl
			: `${API_URL}${apiArticle.thumbnailUrl}`;
	}

	return {
		id: apiArticle.id,
		category: getCategoryName(apiArticle.source),
		title: title,
		excerpt: getExcerpt(fullContent),
		fullContent: fullContent,
		image: imageUrl,
		author: "Curated",
		date: getTimeAgo(apiArticle.crawledAt),
		readTime: getReadTime(fullContent),
		tags: ensureArray(apiArticle.tags),
		originalUrl: apiArticle.originalUrl,
		source: apiArticle.source,
	};
}

// =========================================
// DOM Elements
// =========================================

const elements = {
	newsGrid: document.getElementById("newsGrid"),
	notificationBanner: document.getElementById("notificationBanner"),
	notificationBtn: document.getElementById("notificationBtn"),
	notificationEnable: document.getElementById("notificationEnable"),
	notificationDismiss: document.getElementById("notificationDismiss"),
	installBanner: document.getElementById("installBanner"),
	installAccept: document.getElementById("installAccept"),
	installDismiss: document.getElementById("installDismiss"),
	navInstallBtn: document.getElementById("navInstallBtn"),
	toast: document.getElementById("toast"),
	categoryPills: document.querySelectorAll(".category-pill"),
	// Modal elements
	articleModal: document.getElementById("articleModal"),
	modalClose: document.getElementById("modalClose"),
	modalCategory: document.getElementById("modalCategory"),
	modalTitle: document.getElementById("modalTitle"),
	modalAuthor: document.getElementById("modalAuthor"),
	modalDate: document.getElementById("modalDate"),
	modalReadTime: document.getElementById("modalReadTime"),
	modalImage: document.getElementById("modalImage"),
	modalTags: document.getElementById("modalTags"),
	modalContent: document.getElementById("modalContent"),
	modalSourceLink: document.getElementById("modalSourceLink"),
	modalShare: document.getElementById("modalShare"),
	// Search elements
	searchInput: document.getElementById("searchInput"),
	searchClear: document.getElementById("searchClear"),
	// Sort elements
	sortBtn: document.getElementById("sortBtn"),
	sortLabel: document.getElementById("sortLabel"),
};

// =========================================
// State
// =========================================

let deferredInstallPrompt = null;
let currentCategory = "all";
let currentSearch = "";
let currentSort = "latest"; // 'latest' or 'short'
let ALL_LOADED_ARTICLES = []; // Keep a backup for local search
let bodyScrollY = 0; // Track scroll position for body lock

// =========================================
// Utility Functions
// =========================================

/**
 * Check if running as installed PWA
 */
function isPWA() {
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		window.navigator.standalone === true
	);
}

/**
 * Check if on iOS
 */
function isIOS() {
	return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Haptic Feedback Utility
 */
const Haptics = {
	/**
	 * Trigger a haptic pulse
	 * @param {number} duration - Duration in ms (Mainly for Android)
	 */
	trigger(duration = 30) {
		// 1. Android/Chrome - Standard Vibration API
		if (navigator.vibrate) {
			navigator.vibrate(duration);
		}

		// 2. iOS 18+ - Hidden Switch Hack
		// This triggers a native 'Select' haptic pulse
		// Clicking the LABEL is more reliable for triggering the haptic than clicking the input itself
		const trigger = document.getElementById("haptic-trigger");
		if (trigger) {
			trigger.click();
		}
	},
};

// =========================================
// SEO & Routing
// =========================================

/**
 * Router Configuration
 */
const ROUTER = {
	pushedCount: 0,

	init() {
		window.addEventListener("popstate", (e) => this.handleRoute(e.state));
		this.handleRoute(history.state);
	},

	async handleRoute(state) {
		const path = window.location.pathname;
		const searchParams = new URLSearchParams(window.location.search);
		const articleId = searchParams.get("article");

		// Handle Article Route (query param or path)
		if (articleId) {
			// If data isn't loaded yet, fetch it securely
			if (NEWS_DATA.length === 0) {
				await loadNews("all");
			}
			const article = NEWS_DATA.find((a) => a.id === articleId);
			if (article) {
				showArticleModal(article, false); // false = don't push state again
			}
		} else {
			hideArticleModal(false);
			SEO.reset();
		}
	},

	push(article) {
		const url = `?article=${article.id}`;
		history.pushState({ articleId: article.id }, "", url);
		this.pushedCount++;
		SEO.update(article);
	},

	// If on an article directly or refreshed, pushedCount is 0, so we reset to home
	back() {
		// Log for debugging if we could see logs: console.log('ROUTER: back()', this.pushedCount);
		if (this.pushedCount > 0) {
			this.pushedCount--;
			history.back();
		} else {
			this.reset();
		}
	},

	reset() {
		// Use pathname instead of "/" to keep file:// support and avoid SecurityError
		const url = window.location.pathname;
		history.replaceState({}, "", url);
		this.pushedCount = 0;
		SEO.reset();
	},
};

/**
 * SEO Management (Meta Tags & Schema)
 */
const SEO = {
	update(article) {
		// 1. Update Title
		document.title = `${article.title} | Glass News`;

		// 2. Update Primary Meta Tags
		this.setMeta("description", article.excerpt);
		this.setMeta("keywords", article.tags ? article.tags.join(", ") : "");

		// 3. Open Graph Meta Tags
		this.setMeta("og:type", "article");
		this.setMeta("og:site_name", "Glass News");
		this.setMeta("og:title", article.title);
		this.setMeta("og:description", article.excerpt);
		this.setMeta("og:url", window.location.href);
		this.setMeta("og:image", article.image);
		this.setMeta("og:image:secure_url", article.image);
		this.setMeta("og:image:width", "1200");
		this.setMeta("og:image:height", "630");
		this.setMeta("og:image:alt", article.title);
		this.setMeta("og:locale", "en_US");

		// 4. Article-specific Open Graph
		this.setMeta("article:published_time", new Date().toISOString());
		this.setMeta("article:author", article.author || "Glass News Editor");
		this.setMeta("article:section", article.category);
		if (article.tags && article.tags.length > 0) {
			// Note: Multiple tags require special handling
			article.tags.slice(0, 5).forEach((tag) => {
				this.addMetaTag("article:tag", tag);
			});
		}

		// 5. Twitter Card Meta Tags
		this.setMeta("twitter:card", "summary_large_image");
		this.setMeta("twitter:site", "@glassnews");
		this.setMeta("twitter:creator", "@glassnews");
		this.setMeta("twitter:title", article.title);
		this.setMeta("twitter:description", article.excerpt);
		this.setMeta("twitter:image", article.image);
		this.setMeta("twitter:image:alt", article.title);
		this.setMeta("twitter:label1", "Reading time");
		this.setMeta("twitter:data1", article.readTime);
		this.setMeta("twitter:label2", "Category");
		this.setMeta("twitter:data2", article.category);

		// 6. Update Canonical
		const link =
			document.querySelector("link[rel='canonical']") ||
			document.createElement("link");
		link.rel = "canonical";
		link.href = window.location.href;
		if (!link.parentElement) {
			document.head.appendChild(link);
		}

		// 7. Inject Rich JSON-LD Schema
		this.injectSchema({
			"@context": "https://schema.org",
			"@type": "NewsArticle",
			headline: article.title,
			image: {
				"@type": "ImageObject",
				url: article.image,
				width: 1200,
				height: 630,
			},
			datePublished: new Date().toISOString(),
			dateModified: new Date().toISOString(),
			author: {
				"@type": "Person",
				name: article.author || "Glass News Editor",
				url: "https://glass-news.pages.dev",
			},
			publisher: {
				"@type": "Organization",
				name: "Glass News",
			},
			description: article.excerpt,
			articleBody: article.fullContent,
			keywords: article.tags ? article.tags.join(", ") : "",
			articleSection: article.category,
			isAccessibleForFree: "true",
			mainEntityOfPage: {
				"@type": "WebPage",
				"@id": window.location.href,
			},
			url: window.location.href,
			inLanguage: "en-US",
		});
	},

	reset() {
		document.title = "Glass News - Curated News";
		this.setMeta(
			"description",
			"Glass News - Expertly curated news aggregation with beautiful glassmorphism UI",
		);
		this.setMeta("og:title", "Glass News");
		this.setMeta(
			"og:description",
			"Expertly curated news aggregation with beautiful glassmorphism UI",
		);
		this.setMeta("og:type", "website");
		this.removeSchema();
	},

	setMeta(name, content) {
		let element =
			document.querySelector(`meta[name="${name}"]`) ||
			document.querySelector(`meta[property="${name}"]`);

		if (!element) {
			element = document.createElement("meta");
			if (name.startsWith("og:") || name.startsWith("article:")) {
				element.setAttribute("property", name);
			} else {
				element.setAttribute("name", name);
			}
			document.head.appendChild(element);
		}
		element.setAttribute("content", content);
	},

	addMetaTag(name, content) {
		// Create a new meta tag (for multiple values like article:tag)
		const element = document.createElement("meta");
		if (name.startsWith("og:") || name.startsWith("article:")) {
			element.setAttribute("property", name);
		} else {
			element.setAttribute("name", name);
		}
		element.setAttribute("content", content);
		document.head.appendChild(element);
	},

	injectSchema(data) {
		this.removeSchema();
		const script = document.createElement("script");
		script.type = "application/ld+json";
		script.id = "json-ld-schema";
		script.textContent = JSON.stringify(data);
		document.head.appendChild(script);
	},

	removeSchema() {
		const existing = document.getElementById("json-ld-schema");
		if (existing) existing.remove();
	},
};

/**
 * Show toast notification
 */
function showToast(message, type = "default") {
	if (!elements.toast) return;
	elements.toast.textContent = message;
	elements.toast.className = `toast ${type} show`;

	setTimeout(() => {
		elements.toast.classList.remove("show");
	}, 3000);
}

/**
 * Check if notification banner was dismissed
 */
function wasNotificationBannerDismissed() {
	return localStorage.getItem("notificationBannerDismissed") === "true";
}

/**
 * Check if install banner was dismissed
 */
function wasInstallBannerDismissed() {
	return localStorage.getItem("installBannerDismissed") === "true";
}

// =========================================
// News Rendering
// =========================================

/**
 * Create a news card element
 */
function createNewsCard(article) {
	const card = document.createElement("article");
	card.className = "news-card";
	card.dataset.articleId = article.id;

	const imageWrap = document.createElement("div");
	imageWrap.className = "news-card-image";

	const img = document.createElement("img");
	setImageWithFallback(img, article.image, article.title);
	imageWrap.appendChild(img);

	const content = document.createElement("div");
	content.className = "news-card-content";

	const category = document.createElement("span");
	category.className = "news-card-category";
	category.textContent = article.category;

	const title = document.createElement("h3");
	title.className = "news-card-title";
	title.textContent = article.title || FALLBACK_TITLE;

	const excerpt = document.createElement("p");
	excerpt.className = "news-card-excerpt";
	excerpt.textContent = article.excerpt || FALLBACK_EXCERPT;

	const meta = document.createElement("div");
	meta.className = "news-card-meta";

	const author = document.createElement("span");
	author.textContent = article.author || "Curated";

	const date = document.createElement("span");
	date.textContent = article.date || "";

	const readTime = document.createElement("span");
	readTime.textContent = article.readTime ? `${article.readTime} read` : "Quick read";

	meta.appendChild(author);
	meta.appendChild(date);
	meta.appendChild(readTime);

	content.appendChild(category);
	content.appendChild(title);
	content.appendChild(excerpt);
	content.appendChild(meta);

	card.appendChild(imageWrap);
	card.appendChild(content);

	card.addEventListener("click", () => {
		showArticleModal(article);
	});

	return card;
}

/**
 * Load and render news articles from API
 */
async function loadNews(source = null) {
	try {
		if (!elements.newsGrid) return;
		// Show loading state
		elements.newsGrid.innerHTML =
			'<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">Loading articles...</div>';

		// Map category to API source
		// Improved mapping: some categories can have multiple sources
		const sourceMap = {
			all: null,
			tech: ["hackernews", "webrazzi"],
			news: ["wikipedia", "bbc"],
			community: "reddit",
			turkey: ["t24", "eksisozluk", "webrazzi"],
		};

		const mapping = sourceMap[source] || source;

		// If it's an array, we fetch all and filter, or fetch specifically if API supports multiple sources
		// For now, let's stick to fetching from null (all) if it's turkey, but with a larger limit
		const apiSource = Array.isArray(mapping) ? null : mapping;
		const limit = source === "turkey" || source === "all" ? 100 : 50;

		// Fetch articles from API
		const apiArticles = await fetchArticles(apiSource, limit);

		// Transform to UI format
		ALL_LOADED_ARTICLES = apiArticles.map(transformArticle);

		// Initial filter based on category
		if (Array.isArray(mapping)) {
			NEWS_DATA = ALL_LOADED_ARTICLES.filter((a) => mapping.includes(a.source));
		} else {
			NEWS_DATA = ALL_LOADED_ARTICLES;
		}

		// Apply search filter if active
		applySearchFilter();

		// Render articles
		renderNews();

		// Update featured only on 'all' category
		if (source === "all") {
			updateFeaturedArticle();
		}
	} catch (error) {
		console.error("Error loading news:", error);
		if (elements.newsGrid) {
			elements.newsGrid.innerHTML =
				'<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-error);">Failed to load articles. Please try again.</div>';
		}
	}
}

/**
 * Filter articles locally based on search query
 */
function applySearchFilter() {
	if (!currentSearch) {
		// If no search, use the category-filtered data
		NEWS_DATA = [...NEWS_DATA];
		return;
	}

	const query = currentSearch.toLowerCase();
	NEWS_DATA = NEWS_DATA.filter((article) => {
		const inTitle = (article.title || "").toLowerCase().includes(query);
		const inExcerpt = (article.excerpt || "").toLowerCase().includes(query);
		const inCategory = (article.category || "").toLowerCase().includes(query);
		const tags = ensureArray(article.tags);
		const inTags = tags.some((t) => (t || "").toLowerCase().includes(query));

		return inTitle || inExcerpt || inCategory || inTags;
	});

	// Apply sort
	applySort();
}

/**
 * Sort articles based on current currentSort
 */
function applySort() {
	if (currentSort === "short") {
		// Sort by read time (ascending)
		NEWS_DATA.sort((a, b) => {
			const timeA = parseInt(a.readTime) || 0;
			const timeB = parseInt(b.readTime) || 0;
			return timeA - timeB;
		});
	} else {
		// Default to latest (assume order from API is chronological)
	}
}

/**
 * Initialize sorting functionality
 */
function initSort() {
	if (!elements.sortBtn) return;

	elements.sortBtn.addEventListener("click", () => {
		// Toggle sort
		currentSort = currentSort === "latest" ? "short" : "latest";
		elements.sortLabel.textContent =
			currentSort === "latest" ? "Latest" : "Short Reads";

		// Haptic feedback
		Haptics.trigger(30);

		// Re-derive data from current state
		loadNews(currentCategory);
	});
}

/**
 * Initialize search functionality
 */
function initSearch() {
	if (!elements.searchInput) return;

	elements.searchInput.addEventListener("input", (e) => {
		currentSearch = e.target.value;

		// Show/hide clear button
		if (elements.searchClear) {
			elements.searchClear.style.display = currentSearch ? "block" : "none";
		}

		// Locally filter the current data
		// Re-derive category filtered data first
		const mapping = {
			all: null,
			tech: ["hackernews", "webrazzi"],
			news: ["wikipedia", "bbc"],
			community: ["reddit"],
			turkey: ["t24", "eksisozluk", "webrazzi"],
		}[currentCategory];

		if (mapping) {
			NEWS_DATA = ALL_LOADED_ARTICLES.filter((a) => mapping.includes(a.source));
		} else {
			NEWS_DATA = ALL_LOADED_ARTICLES;
		}

		applySearchFilter();
		renderNews();
	});

	elements.searchClear?.addEventListener("click", () => {
		Haptics.trigger(10);
		elements.searchInput.value = "";
		currentSearch = "";
		if (elements.searchClear) elements.searchClear.style.display = "none";

		// Reload/Reset local filtering
		loadNews(currentCategory);
	});
}

/**
 * Render news articles to the grid
 */
function renderNews() {
	if (!elements.newsGrid) return;
	elements.newsGrid.innerHTML = "";

	if (NEWS_DATA.length === 0) {
		elements.newsGrid.innerHTML =
			'<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">No articles available.</div>';
		return;
	}

	NEWS_DATA.forEach((article, index) => {
		const card = createNewsCard(article);
		card.style.animationDelay = `${0.1 + index * 0.05}s`;
		elements.newsGrid.appendChild(card);
	});
}

// =========================================
// Article Modal
// =========================================

/**
 * Show article in modal
 */
function showArticleModal(article, pushToHistory = true) {
	if (!elements.articleModal || !elements.modalContent) return;
	// Optimized for Safari: We rely on backdrop-filter on the overlay now
	// rather than blurring the whole page content.

	// Update Router & SEO if needed
	if (pushToHistory) {
		ROUTER.push(article);
	}

	// Update modal content
	if (elements.modalCategory) elements.modalCategory.textContent = article.category;
	if (elements.modalTitle) elements.modalTitle.textContent = article.title;
	if (elements.modalAuthor) elements.modalAuthor.textContent = article.author;
	if (elements.modalDate) elements.modalDate.textContent = article.date;
	if (elements.modalReadTime) {
		elements.modalReadTime.textContent = article.readTime + " read";
	}
	setImageWithFallback(elements.modalImage, article.image, article.title);
	if (elements.modalSourceLink) {
		elements.modalSourceLink.href = article.originalUrl || "#";
	}

	// Update tags
	if (elements.modalTags) elements.modalTags.innerHTML = "";
	const tagList = ensureArray(article.tags);
	if (elements.modalTags && tagList.length > 0) {
		tagList.forEach((tag) => {
			const tagEl = document.createElement("span");
			tagEl.className = "article-modal-tag clickable";
			tagEl.textContent = tag;
			tagEl.addEventListener("click", () => {
				// Filter by tag
				currentSearch = tag;
				if (elements.searchInput) elements.searchInput.value = tag;
				if (elements.searchClear) elements.searchClear.style.display = "block";

				hideArticleModal();

				// Re-filter and render
				applySearchFilter();
				renderNews();

				showToast(`Filtering by tag: ${tag}`, "success");
			});
			elements.modalTags.appendChild(tagEl);
		});
	}

	// Update content with proper paragraph formatting (Force <br> for robust mobile rendering)
	const paragraphs = (article.fullContent || "")
		.split("\n\n")
		.filter((p) => p.trim());
	elements.modalContent.innerHTML = "";
	if (paragraphs.length === 0) {
		const fallback = document.createElement("p");
		fallback.textContent = FALLBACK_EXCERPT;
		elements.modalContent.appendChild(fallback);
	} else {
		paragraphs.forEach((para) => {
			const p = document.createElement("p");
			p.style.whiteSpace = "pre-wrap";
			p.style.marginBottom = "1.5em";
			p.textContent = para.trim();
			elements.modalContent.appendChild(p);
		});
	}

	// Show modal
	elements.articleModal.style.display = "flex";

	// Haptic feedback
	Haptics.trigger(50);

	// Reset scroll
	const content = elements.articleModal.querySelector(".article-modal-content");
	if (content) content.scrollTop = 0;

	setTimeout(() => {
		elements.articleModal.classList.add("show");

		// Animate image if needed
		requestAnimationFrame(() => {
			const img = elements.articleModal.querySelector(".article-modal-image");
			if (img) img.style.transform = "scale(1.05)";
			setTimeout(() => {
				if (img) img.style.transform = "scale(1)";
			}, 500);
		});
	}, 10);

	// Prevent body scroll (Platform-aware Fix)
	const isIOS =
		/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

	if (isIOS) {
		bodyScrollY = window.scrollY;
		document.body.style.position = "fixed";
		document.body.style.top = `-${bodyScrollY}px`;
		document.body.style.width = "100%";
	} else {
		document.body.style.overflow = "hidden";
		document.body.style.height = "100%";
	}

	// Store article ID on share button for link generation
	if (elements.modalShare) {
		elements.modalShare.dataset.articleId = article.id;
	}
}

/**
 * Hide article modal
 */
function hideArticleModal(updateHistory = true) {
	// If the modal is already hidden, do nothing
	if (elements.articleModal && elements.articleModal.style.display === "none") {
		return;
	}

	if (updateHistory) {
		ROUTER.back();
	}

	if (!elements.articleModal) return;
	elements.articleModal.classList.remove("show");
	setTimeout(() => {
		elements.articleModal.style.display = "none";
	}, 400);

	// Restore body scroll
	const isIOS =
		/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

	if (isIOS) {
		document.body.style.position = "";
		document.body.style.top = "";
		document.body.style.width = "";
		window.scrollTo(0, bodyScrollY);
	} else {
		document.body.style.overflow = "";
		document.body.style.height = "";
	}
}

/**
 * Initialize modal handlers
 */
function initModal() {
	// Close button
	const closeBtn = document.getElementById("modalClose");
	if (closeBtn) {
		closeBtn.addEventListener("click", (e) => {
			Haptics.trigger(10);
			if (e) e.preventDefault();
			hideArticleModal(true);
		});
	}

	// Overlay click
	const overlay = elements.articleModal?.querySelector(
		".article-modal-overlay",
	);
	if (overlay) {
		overlay.addEventListener("click", (e) => {
			if (e) e.preventDefault();
			hideArticleModal(true);
		});
	}

	// Escape key
	document.addEventListener("keydown", (e) => {
		if (
			e.key === "Escape" &&
			elements.articleModal &&
			elements.articleModal.classList.contains("show")
		) {
			hideArticleModal();
		}
	});

	// Share button
	elements.modalShare?.addEventListener("click", () => {
		const title = elements.modalTitle?.textContent || "Glass News";
		const text = ""; // User requested to share only the link

		// Use canonical app link (Hardcoded production URL)
		const articleId = elements.modalShare.dataset.articleId;
		const url = articleId
			? `https://glass-news.pages.dev/?article=${articleId}`
			: elements.modalSourceLink?.href || window.location.href;

		handleShare(title, text, url);
	});
}

/**
 * Handle content sharing
 */
async function handleShare(title, text, url) {
	// Haptic feedback
	Haptics.trigger(50);

	if (navigator.share) {
		try {
			await navigator.share({
				title: title,
				text: text,
				url: url,
			});
			showToast("Shared successfully!", "success");
		} catch (error) {
			if (error.name !== "AbortError") {
				console.error("Error sharing:", error);
				copyToClipboard(url);
			}
		}
	} else {
		copyToClipboard(url);
	}
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
	try {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
			showToast("Link copied to clipboard!", "success");
			return;
		}

		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "absolute";
		textarea.style.left = "-9999px";
		document.body.appendChild(textarea);
		textarea.select();
		const ok = document.execCommand("copy");
		textarea.remove();

		if (ok) {
			showToast("Link copied to clipboard!", "success");
		} else {
			throw new Error("execCommand copy failed");
		}
	} catch (err) {
		console.error("Failed to copy:", err);
		showToast("Could not copy link", "error");
	}
}

// =========================================
// Category Filtering
// =========================================

function initCategoryFilters() {
	if (!elements.categoryPills || elements.categoryPills.length === 0) return;
	elements.categoryPills.forEach((pill) => {
		pill.addEventListener("click", () => {
			// Update active state
			elements.categoryPills.forEach((p) => p.classList.remove("active"));
			pill.classList.add("active");

			// Haptic feedback
			Haptics.trigger(20);

			// Load news for category
			currentCategory = pill.dataset.category;
			loadNews(currentCategory);
		});
	});
}

// =========================================
// Notifications System
// =========================================

/**
 * Check if notifications are supported
 */
function notificationsSupported() {
	return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Request notification permission
 */
async function requestNotificationPermission() {
	if (!notificationsSupported()) {
		showToast("Notifications not supported in this browser", "error");
		return false;
	}

	// iOS requires PWA to be installed
	if (isIOS() && !isPWA()) {
		showToast("Add to Home Screen first to enable notifications", "error");
		return false;
	}

	try {
		const permission = await Notification.requestPermission();
		if (permission === "granted") {
			showToast("Notifications enabled!", "success");

			// Subscribe to Push
			await subscribeToPush();

			if (elements.notificationBanner) {
				elements.notificationBanner.style.display = "none";
				// Store dismissed state forever if enabled
				localStorage.setItem("notificationBannerDismissed", "true");
			}
			return true;
		}
		return false;
	} catch (error) {
		console.error("Error requesting permission:", error);
		showToast("Could not enable notifications", "error");
		return false;
	}
}

/**
 * Subscribe to Push Notifications
 */
async function subscribeToPush() {
	if (!("serviceWorker" in navigator)) return;

	try {
		const registration = await navigator.serviceWorker.ready;

		// Subscribe
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
		});

		console.log("Push Subscription:", subscription);

		// Send to backend
		const response = await fetch(`${API_URL}/api/subscribe`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(subscription),
		});

		if (response.ok) {
			console.log("Subscribed to push notifications on server");
			showToast("Detailed: Connected to Push Server ✅", "success");
		} else {
			throw new Error("Server rejected subscription");
		}
	} catch (error) {
		console.error("Failed to subscribe to push:", error);
		showToast(`Push Error: ${error.message}`, "error");
	}
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, "+")
		.replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

/**
 * Show a local notification
 */
function showLocalNotification(title, options = {}) {
	if (Notification.permission !== "granted") {
		console.warn("Notification permission not granted");
		return;
	}

	const defaultOptions = {
		icon: "icons/icon-192.svg",
		badge: "icons/badge-72.svg",
		vibrate: [100, 50, 100],
		data: { url: window.location.href },
		...options,
	};

	// Use service worker for better PWA integration
	if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.ready.then((registration) => {
			registration.showNotification(title, defaultOptions);
		});
	} else {
		// Fallback to regular notification
		new Notification(title, defaultOptions);
	}
}

/**
 * Schedule a notification for later
 */
function scheduleNotification(title, options, delayMs) {
	return setTimeout(() => {
		showLocalNotification(title, options);
	}, delayMs);
}

/**
 * Show notification permission banner
 */
function showNotificationBanner() {
	if (wasNotificationBannerDismissed()) return;
	if (!notificationsSupported()) return;
	if (Notification.permission === "granted") return;
	if (Notification.permission === "denied") return;

	// Delay showing the banner for better UX
	setTimeout(() => {
		if (elements.notificationBanner) {
			elements.notificationBanner.style.display = "block";
		}
	}, 3000);
}

/**
 * Hide notification permission banner
 */
function hideNotificationBanner() {
	if (elements.notificationBanner) {
		elements.notificationBanner.style.display = "none";
	}
}

/**
 * Initialize notification UI
 */
function initNotifications() {
	// Enable button
	elements.notificationEnable?.addEventListener("click", () => {
		Haptics.trigger(30);
		requestNotificationPermission();
	});

	// Dismiss button
	elements.notificationDismiss?.addEventListener("click", () => {
		Haptics.trigger(10);
		hideNotificationBanner();
		localStorage.setItem("notificationBannerDismissed", "true");
	});

	// Navbar notification button
	elements.notificationBtn?.addEventListener("click", async () => {
		Haptics.trigger(20);
		if (Notification.permission === "granted") {
			showToast("Syncing push subscription...", "info");
			await subscribeToPush();
			showLocalNotification("Test Notification", {
				body: "Remote notifications synced!",
			});
		} else {
			requestNotificationPermission();
		}
	});

	// Show banner if appropriate
	showNotificationBanner();
}

// =========================================
// PWA Install Prompt
// =========================================

/**
 * Show install banner
 */
function showInstallBanner() {
	if (wasInstallBannerDismissed()) return;
	if (isPWA()) return;

	if (elements.installBanner) {
		elements.installBanner.style.display = "block";
	}
}

/**
 * Hide install banner
 */
function hideInstallBanner() {
	if (elements.installBanner) {
		elements.installBanner.style.display = "none";
	}
}

/**
 * Handle install prompt
 */
async function handleInstallClick() {
	if (!deferredInstallPrompt) {
		// For iOS, show instructions
		if (isIOS()) {
			showToast('Tap Share, then "Add to Home Screen"');
		}
		return;
	}

	// Show the install prompt
	deferredInstallPrompt.prompt();

	// Wait for user response
	const { outcome } = await deferredInstallPrompt.userChoice;

	if (outcome === "accepted") {
		showToast("App installed!", "success");
		if (elements.navInstallBtn) elements.navInstallBtn.style.display = "none";
	}

	deferredInstallPrompt = null;
	hideInstallBanner();
}

/**
 * Check if app is running in standalone mode (installed)
 */
function isStandalone() {
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		window.navigator.standalone === true ||
		document.referrer.includes("android-app://")
	);
}

/**
 * Initialize PWA install handling
 */
function initInstallPrompt() {
	// Capture the install prompt
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		deferredInstallPrompt = e;
		showInstallBanner();
	});

	// Handle successful install
	window.addEventListener("appinstalled", () => {
		hideInstallBanner();
		deferredInstallPrompt = null;
		showToast("App installed successfully!", "success");
	});

	// Install button click
	elements.installAccept?.addEventListener("click", handleInstallClick);

	// Dismiss button
	elements.installDismiss?.addEventListener("click", () => {
		Haptics.trigger(10);
		hideInstallBanner();
		localStorage.setItem("installBannerDismissed", "true");
	});

	// Show iOS instructions if applicable
	if (isIOS() && !isPWA() && !wasInstallBannerDismissed()) {
		setTimeout(() => {
			showInstallBanner();
		}, 5000);
	}
}

// =========================================
// Service Worker Registration
// =========================================

async function registerServiceWorker() {
	if ("serviceWorker" in navigator) {
		try {
			const registration = await navigator.serviceWorker.register("sw.js", {
				scope: "/",
			});

			console.log("Service Worker registered:", registration.scope);

			// Handle updates - Logic to show "Update Available"
			registration.addEventListener("updatefound", () => {
				const newWorker = registration.installing;
				console.log("[SW] Update found:", newWorker);

				newWorker.addEventListener("statechange", () => {
					console.log("[SW] State changed:", newWorker.state);
					if (
						newWorker.state === "installed" &&
						navigator.serviceWorker.controller
					) {
						// New worker installed and waiting to take over
						console.log("[SW] persistent update ready");
						showUpdateToast();
					}
				});
			});
		} catch (error) {
			console.error("Service Worker registration failed:", error);
		}

		// Reload when the new worker takes control
		let refreshing = false;
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			if (!refreshing) {
				refreshing = true;
				window.location.reload();
			}
		});
	}
}

// Add Update Toast UI Helper
function showUpdateToast() {
	if (document.querySelector(".update-toast")) return; // Prevent duplicates

	const toast = document.createElement("div");
	toast.className = "update-toast glass-panel";
	toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <div>
                <div style="font-weight: 600;">Update Available</div>
                <div style="font-size: 0.8rem; opacity: 0.8;">Tap to apply changes</div>
            </div>
        </div>
        <button class="btn btn-primary" onclick="window.location.reload()">Update</button>
    `;

	Object.assign(toast.style, {
		position: "fixed",
		bottom: "24px",
		left: "50%",
		transform: "translateX(-50%) translateY(100px)",
		zIndex: "10000",
		padding: "12px 20px",
		borderRadius: "16px",
		display: "flex",
		alignItems: "center",
		gap: "16px",
		background: "rgba(20, 20, 30, 0.95)",
		backdropFilter: "blur(20px)",
		"-webkit-backdrop-filter": "blur(20px)",
		border: "1px solid rgba(255, 255, 255, 0.15)",
		color: "white",
		boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
		transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
	});

	document.body.appendChild(toast);

	// Animate in
	requestAnimationFrame(() => {
		toast.style.transform = "translateX(-50%) translateY(0)";
	});
}

// =========================================
// Theme Management
// =========================================

/**
 * Initialize theme listener for PWA meta tag
 */
function initThemeListener() {
	const themeMeta = document.querySelector('meta[name="theme-color"]');
	const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

	const updateThemeColor = (e) => {
		const isLight = e.matches;
		if (themeMeta) {
			themeMeta.setAttribute("content", isLight ? "#f5f5f7" : "#0a0a0f");
		}
	};

	// Initial check
	updateThemeColor(mediaQuery);

	// Listen for changes
	mediaQuery.addEventListener("change", updateThemeColor);
}

// =========================================
// Version Management
// =========================================

/**
 * Fetch version info from version.json
 */
async function fetchVersionInfo() {
	try {
		const response = await fetch("version.json?" + Date.now()); // Cache bust
		if (response.ok) {
			VERSION_INFO = await response.json();
			updateVersionDisplay();
		}
	} catch (error) {
		console.log("Could not load version info:", error);
	}
}

/**
 * Update version display in UI
 */
function updateVersionDisplay() {
	const versionElements = document.querySelectorAll(".app-version");
	versionElements.forEach((el) => {
		el.textContent = `v${VERSION_INFO.version}`;
	});

	// Update navbar version to be clickable
	const navVersion = document.querySelector(".navbar-version");
	if (navVersion && VERSION_INFO.buildTime) {
		const buildDate = new Date(VERSION_INFO.buildTime);
		const formattedDate = buildDate.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		navVersion.title = `Build: ${formattedDate} UTC`;
		navVersion.style.cursor = "pointer";
		navVersion.addEventListener("click", () => {
			showToast(
				`v${VERSION_INFO.version} • Built ${formattedDate} UTC`,
				"default",
			);
		});
	}
}

// =========================================
// Initialize App
// =========================================

async function init() {
	// Fetch version info first
	await fetchVersionInfo();
	// Initialize features first
	initModal();
	initCategoryFilters();
	initSearch();
	initSort();
	initNotifications();
	initInstallPrompt();

	// Initialize Router (Handles initial URL)
	ROUTER.init();

	// Load initial news from API
	await loadNews("all");

	// If we landed on an article directly, try to finding it in the loaded news
	// The ROUTER.handleRoute logic is triggered again or we can explicitly check
	const urlParams = new URLSearchParams(window.location.search);
	const articleId = urlParams.get("article");
	if (articleId && NEWS_DATA.length > 0) {
		const article = NEWS_DATA.find((a) => a.id === articleId);
		if (article) showArticleModal(article, false);
	}

	// Register service worker
	registerServiceWorker();

	// Update featured article with latest
	updateFeaturedArticle();

	// Add theme change listener
	initThemeListener();

	console.log("Glass News PWA initialized");
	console.log("PWA mode:", isPWA());
	console.log("iOS:", isIOS());
	console.log("Notifications supported:", notificationsSupported());

	// Initialize test notifications if param is present
	initTestNotifications();
}

/**
 * Update featured article with latest from feed
 */
function updateFeaturedArticle() {
	if (NEWS_DATA.length === 0) return;

	const featured = NEWS_DATA[0];
	const featuredCard = document.querySelector(".featured-card");

	if (featuredCard && featured) {
		const featuredImage = featuredCard.querySelector(
			".featured-card-image img",
		);
		const featuredTitle = featuredCard.querySelector(".featured-card-title");
		const featuredExcerpt = featuredCard.querySelector(
			".featured-card-excerpt",
		);
		const button = featuredCard.querySelector(".btn-primary");

		setImageWithFallback(featuredImage, featured.image, featured.title);
		if (featuredTitle) featuredTitle.textContent = featured.title;
		if (featuredExcerpt) featuredExcerpt.textContent = featured.excerpt;
		if (button) {
			button.onclick = () => {
				showArticleModal(featured);
			};
		}
	}
}
/**
 * Initialize test notifications for development
 */
function initTestNotifications() {
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get("notifications") !== "test") return;

	console.log("Initializing test notifications...");

	if (!("Notification" in window)) {
		console.log("This browser does not support desktop notification");
		return;
	}

	Notification.requestPermission().then((permission) => {
		if (permission === "granted") {
			console.log("Notification permission granted. Starting 5-minute timer.");
			showToast("Test notifications enabled (every 5m)", "success");

			// Initial test notification
			try {
				new Notification("Glass News Test", {
					body: "Test notifications enabled. You will receive one every 5 minutes.",
					icon: "icons/icon-192.svg",
				});
			} catch (e) {
				console.error("Error showing initial notification:", e);
			}

			setInterval(() => {
				const messages = [
					"Breaking: New Glass Technology Revealed",
					"Market Update: Tech Stocks Soar",
					"Review: The New Vision Pro",
					"Analysis: Tech Trends and Insights",
					"Culture: The Rise of Digital Art",
				];
				const randomMsg = messages[Math.floor(Math.random() * messages.length)];

				try {
					console.log("Sending test notification:", randomMsg);
					new Notification("Glass News Alert", {
						body: randomMsg,
						icon: "icons/icon-192.svg",
						tag: "news-test-" + Date.now(), // Ensure it pops up as new
					});
				} catch (e) {
					console.error("Error showing interval notification:", e);
				}
			}, 300000); // 5 minutes
		} else {
			console.log("Notification permission denied");
			showToast("Notification permission denied", "error");
		}
	});
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
