/**
 * AI News PWA - Main Application
 * Features: Local notifications, offline support, dynamic content
 */

// =========================================
// Sample News Data (Replace with your API)
// =========================================

const NEWS_DATA = [
  {
    id: '1',
    category: 'Research',
    title: 'DeepMind Achieves Breakthrough in Protein Structure Prediction',
    excerpt: 'New AlphaFold 3 model can predict protein-ligand interactions with unprecedented accuracy, opening doors for drug discovery.',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80',
    author: 'Sarah Chen',
    date: '2 hours ago',
    readTime: '5 min'
  },
  {
    id: '2',
    category: 'Industry',
    title: 'Apple Integrates Advanced AI Features Across All Devices',
    excerpt: 'iOS 19 introduces on-device AI processing for enhanced privacy and performance in everyday tasks.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
    author: 'Michael Park',
    date: '4 hours ago',
    readTime: '4 min'
  },
  {
    id: '3',
    category: 'Startups',
    title: 'AI Coding Assistant Startup Raises $500M at $5B Valuation',
    excerpt: 'The rapid growth of AI-powered development tools continues as enterprise adoption accelerates.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
    author: 'Emma Wilson',
    date: '6 hours ago',
    readTime: '3 min'
  },
  {
    id: '4',
    category: 'Ethics',
    title: 'EU Passes Comprehensive AI Regulation Framework',
    excerpt: 'New legislation establishes strict guidelines for high-risk AI applications and mandates transparency requirements.',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&q=80',
    author: 'David Mueller',
    date: '8 hours ago',
    readTime: '6 min'
  },
  {
    id: '5',
    category: 'Tools',
    title: 'Open Source LLM Surpasses GPT-4 on Key Benchmarks',
    excerpt: 'Community-driven development produces state-of-the-art results, democratizing access to advanced AI capabilities.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
    author: 'Alex Rivera',
    date: '10 hours ago',
    readTime: '4 min'
  },
  {
    id: '6',
    category: 'Research',
    title: 'Researchers Develop AI That Can Explain Its Reasoning',
    excerpt: 'New interpretability breakthrough allows users to understand how AI models arrive at their conclusions.',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80',
    author: 'Lisa Zhang',
    date: '12 hours ago',
    readTime: '5 min'
  }
];

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
  categoryPills: document.querySelectorAll('.category-pill')
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
    // Handle article click - you'd navigate to article page
    showToast(`Opening: ${article.title}`);
  });
  
  return card;
}

/**
 * Render news articles to the grid
 */
function renderNews(category = 'all') {
  const filtered = category === 'all' 
    ? NEWS_DATA 
    : NEWS_DATA.filter(a => a.category.toLowerCase() === category.toLowerCase());
  
  elements.newsGrid.innerHTML = '';
  
  filtered.forEach((article, index) => {
    const card = createNewsCard(article);
    card.style.animationDelay = `${0.1 + index * 0.05}s`;
    elements.newsGrid.appendChild(card);
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
      
      // Filter news
      currentCategory = pill.dataset.category;
      renderNews(currentCategory);
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

function init() {
  // Render initial news
  renderNews();
  
  // Initialize features
  initCategoryFilters();
  initNotifications();
  initInstallPrompt();
  
  // Register service worker
  registerServiceWorker();
  
  // Demo: simulate breaking news
  simulateBreakingNews();
  
  console.log('AI News PWA initialized');
  console.log('PWA mode:', isPWA());
  console.log('iOS:', isIOS());
  console.log('Notifications supported:', notificationsSupported());
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
