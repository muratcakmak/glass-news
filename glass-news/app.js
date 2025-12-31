/**
 * AI News PWA - Main Application
 * Features: Local notifications, offline support, dynamic content
 */

// =========================================
// API Configuration
// =========================================

const API_URL = 'https://news-data.omc345.workers.dev';
let NEWS_DATA = [];

/**
 * Fetch articles from API
 */
async function fetchArticles(source = null, limit = 50) {
  try {
    const url = source
      ? `${API_URL}/api/articles?source=${source}&limit=${limit}`
      : `${API_URL}/api/articles?limit=${limit}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Error fetching articles:', error);
    showToast('Failed to load articles', 'error');
    return [];
  }
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
    return 'Just now';
  };

  const getReadTime = (content) => {
    if (!content) return '3 min';
    const words = content.split(' ').length;
    const mins = Math.ceil(words / 200);
    return `${mins} min`;
  };

  const getCategoryName = (source) => {
    const map = {
      'hackernews': 'Tech',
      'wikipedia': 'News',
      'reddit': 'Community',
      't24': 'Turkey',
      'eksisozluk': 'Turkey'
    };
    return map[source] || source;
  };

  return {
    id: apiArticle.id,
    category: getCategoryName(apiArticle.source),
    title: apiArticle.transformedTitle || apiArticle.originalTitle,
    excerpt: apiArticle.transformedContent
      ? apiArticle.transformedContent.substring(0, 200) + '...'
      : apiArticle.originalContent.substring(0, 200) + '...',
    fullContent: apiArticle.transformedContent || apiArticle.originalContent,
    image: apiArticle.thumbnailUrl?.startsWith('http')
      ? apiArticle.thumbnailUrl
      : `${API_URL}${apiArticle.thumbnailUrl}`,
    author: 'AI Curated',
    date: getTimeAgo(apiArticle.crawledAt),
    readTime: getReadTime(apiArticle.transformedContent || apiArticle.originalContent),
    tags: apiArticle.tags || [],
    originalUrl: apiArticle.originalUrl,
    source: apiArticle.source
  };
}

// =========================================
// DOM Elements
// =========================================

const elements = {
  newsGrid: document.getElementById('newsGrid'),
  notificationBanner: document.getElementById('notificationBanner'),
  notificationBtn: document.getElementById('notificationBtn'),
  notificationEnable: document.getElementById('notificationEnable'),
  notificationDismiss: document.getElementById('notificationDismiss'),
  installBanner: document.getElementById('installBanner'),
  installAccept: document.getElementById('installAccept'),
  installDismiss: document.getElementById('installDismiss'),
  toast: document.getElementById('toast'),
  categoryPills: document.querySelectorAll('.category-pill'),
  // Modal elements
  articleModal: document.getElementById('articleModal'),
  modalClose: document.getElementById('modalClose'),
  modalCategory: document.getElementById('modalCategory'),
  modalTitle: document.getElementById('modalTitle'),
  modalAuthor: document.getElementById('modalAuthor'),
  modalDate: document.getElementById('modalDate'),
  modalReadTime: document.getElementById('modalReadTime'),
  modalImage: document.getElementById('modalImage'),
  modalTags: document.getElementById('modalTags'),
  modalContent: document.getElementById('modalContent'),
  modalSourceLink: document.getElementById('modalSourceLink')
};

// =========================================
// State
// =========================================

let deferredInstallPrompt = null;
let currentCategory = 'all';

// =========================================
// Utility Functions
// =========================================

/**
 * Check if running as installed PWA
 */
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Check if on iOS
 */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'default') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

/**
 * Check if notification banner was dismissed
 */
function wasNotificationBannerDismissed() {
  return localStorage.getItem('notificationBannerDismissed') === 'true';
}

/**
 * Check if install banner was dismissed
 */
function wasInstallBannerDismissed() {
  return localStorage.getItem('installBannerDismissed') === 'true';
}

// =========================================
// News Rendering
// =========================================

/**
 * Create a news card element
 */
function createNewsCard(article) {
  const card = document.createElement('article');
  card.className = 'news-card';
  card.dataset.articleId = article.id;
  
  card.innerHTML = `
    <div class="news-card-image">
      <img src="${article.image}" alt="${article.title}" loading="lazy">
    </div>
    <div class="news-card-content">
      <span class="news-card-category">${article.category}</span>
      <h3 class="news-card-title">${article.title}</h3>
      <p class="news-card-excerpt">${article.excerpt}</p>
      <div class="news-card-meta">
        <span>${article.author}</span>
        <span>${article.date}</span>
        <span>${article.readTime} read</span>
      </div>
    </div>
  `;
  
  card.addEventListener('click', () => {
    showArticleModal(article);
  });
  
  return card;
}

/**
 * Load and render news articles from API
 */
async function loadNews(source = null) {
  try {
    // Show loading state
    elements.newsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">Loading articles...</div>';

    // Map category to API source
    const sourceMap = {
      'all': null,
      'tech': 'hackernews',
      'news': 'wikipedia',
      'community': 'reddit',
      'turkey': null // Load all Turkish sources
    };

    const apiSource = sourceMap[source] || source;

    // Fetch articles from API
    const apiArticles = await fetchArticles(apiSource, 50);

    // Transform to UI format
    NEWS_DATA = apiArticles.map(transformArticle);

    // Filter for Turkey category if selected
    if (source === 'turkey') {
      NEWS_DATA = NEWS_DATA.filter(a => a.source === 't24' || a.source === 'eksisozluk');
    }

    // Render articles
    renderNews();
  } catch (error) {
    console.error('Error loading news:', error);
    elements.newsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-error);">Failed to load articles. Please try again.</div>';
  }
}

/**
 * Render news articles to the grid
 */
function renderNews() {
  elements.newsGrid.innerHTML = '';

  if (NEWS_DATA.length === 0) {
    elements.newsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">No articles available.</div>';
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
function showArticleModal(article) {
  // Update modal content
  elements.modalCategory.textContent = article.category;
  elements.modalTitle.textContent = article.title;
  elements.modalAuthor.textContent = article.author;
  elements.modalDate.textContent = article.date;
  elements.modalReadTime.textContent = article.readTime + ' read';
  elements.modalImage.src = article.image;
  elements.modalImage.alt = article.title;
  elements.modalSourceLink.href = article.originalUrl;

  // Update tags
  elements.modalTags.innerHTML = '';
  if (article.tags && article.tags.length > 0) {
    article.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'article-modal-tag';
      tagEl.textContent = tag;
      elements.modalTags.appendChild(tagEl);
    });
  }

  // Update content with proper paragraph formatting
  const paragraphs = article.fullContent.split('\n\n').filter(p => p.trim());
  elements.modalContent.innerHTML = paragraphs
    .map(p => `<p>${p.trim()}</p>`)
    .join('');

  // Show modal
  elements.articleModal.style.display = 'flex';
  setTimeout(() => {
    elements.articleModal.classList.add('show');
  }, 10);

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

/**
 * Hide article modal
 */
function hideArticleModal() {
  elements.articleModal.classList.remove('show');
  setTimeout(() => {
    elements.articleModal.style.display = 'none';
  }, 300);

  // Restore body scroll
  document.body.style.overflow = '';
}

/**
 * Initialize modal handlers
 */
function initModal() {
  // Close button
  elements.modalClose?.addEventListener('click', hideArticleModal);

  // Overlay click
  elements.articleModal?.querySelector('.article-modal-overlay')?.addEventListener('click', hideArticleModal);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.articleModal.classList.contains('show')) {
      hideArticleModal();
    }
  });
}

// =========================================
// Category Filtering
// =========================================

function initCategoryFilters() {
  elements.categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      // Update active state
      elements.categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

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
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Request notification permission
 */
async function requestNotificationPermission() {
  if (!notificationsSupported()) {
    showToast('Notifications not supported in this browser', 'error');
    return false;
  }
  
  // iOS requires PWA to be installed
  if (isIOS() && !isPWA()) {
    showToast('Add to Home Screen first to enable notifications', 'error');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      showToast('Notifications enabled!', 'success');
      hideNotificationBanner();
      
      // Show a welcome notification
      setTimeout(() => {
        showLocalNotification('Welcome to AI News!', {
          body: 'You\'ll now receive breaking AI news updates.',
          icon: 'icons/icon-192.svg',
          badge: 'icons/badge-72.svg'
        });
      }, 1000);
      
      return true;
    } else {
      showToast('Notification permission denied', 'error');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    showToast('Could not request permission', 'error');
    return false;
  }
}

/**
 * Show a local notification
 */
function showLocalNotification(title, options = {}) {
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }
  
  const defaultOptions = {
    icon: 'icons/icon-192.svg',
    badge: 'icons/badge-72.svg',
    vibrate: [100, 50, 100],
    data: { url: window.location.href },
    ...options
  };
  
  // Use service worker for better PWA integration
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
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
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  
  // Delay showing the banner for better UX
  setTimeout(() => {
    elements.notificationBanner.style.display = 'block';
  }, 3000);
}

/**
 * Hide notification permission banner
 */
function hideNotificationBanner() {
  elements.notificationBanner.style.display = 'none';
}

/**
 * Initialize notification UI
 */
function initNotifications() {
  // Enable button
  elements.notificationEnable?.addEventListener('click', () => {
    requestNotificationPermission();
  });
  
  // Dismiss button
  elements.notificationDismiss?.addEventListener('click', () => {
    hideNotificationBanner();
    localStorage.setItem('notificationBannerDismissed', 'true');
  });
  
  // Navbar notification button
  elements.notificationBtn?.addEventListener('click', () => {
    if (Notification.permission === 'granted') {
      showLocalNotification('Test Notification', {
        body: 'Notifications are working correctly!'
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
  
  elements.installBanner.style.display = 'block';
}

/**
 * Hide install banner
 */
function hideInstallBanner() {
  elements.installBanner.style.display = 'none';
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
  
  if (outcome === 'accepted') {
    showToast('App installed!', 'success');
  }
  
  deferredInstallPrompt = null;
  hideInstallBanner();
}

/**
 * Initialize PWA install handling
 */
function initInstallPrompt() {
  // Capture the install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
  });
  
  // Handle successful install
  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredInstallPrompt = null;
    showToast('App installed successfully!', 'success');
  });
  
  // Install button click
  elements.installAccept?.addEventListener('click', handleInstallClick);
  
  // Dismiss button
  elements.installDismiss?.addEventListener('click', () => {
    hideInstallBanner();
    localStorage.setItem('installBannerDismissed', 'true');
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
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', registration.scope);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('New version available! Refresh to update.');
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// =========================================
// Simulate Breaking News (Demo)
// =========================================

function simulateBreakingNews() {
  // Simulate receiving breaking news after 30 seconds
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      showLocalNotification('Breaking: New AI Model Released', {
        body: 'A revolutionary new language model has just been announced. Tap to read more.',
        tag: 'breaking-news',
        requireInteraction: true
      });
    }
  }, 30000);
}

// =========================================
// Initialize App
// =========================================

async function init() {
  // Load initial news from API
  await loadNews('all');

  // Initialize features
  initModal();
  initCategoryFilters();
  initNotifications();
  initInstallPrompt();

  // Register service worker
  registerServiceWorker();

  // Update featured article with latest
  updateFeaturedArticle();

  console.log('AI News PWA initialized');
  console.log('PWA mode:', isPWA());
  console.log('iOS:', isIOS());
  console.log('Notifications supported:', notificationsSupported());
}

/**
 * Update featured article with latest from feed
 */
function updateFeaturedArticle() {
  if (NEWS_DATA.length === 0) return;

  const featured = NEWS_DATA[0];
  const featuredCard = document.querySelector('.featured-card');

  if (featuredCard && featured) {
    featuredCard.querySelector('.featured-card-image img').src = featured.image;
    featuredCard.querySelector('.featured-card-title').textContent = featured.title;
    featuredCard.querySelector('.featured-card-excerpt').textContent = featured.excerpt;

    const button = featuredCard.querySelector('.btn-primary');
    button.onclick = () => {
      showArticleModal(featured);
    };
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
