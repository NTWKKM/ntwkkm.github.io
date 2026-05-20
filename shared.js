// shared.js

// ===========================================================================
// ERROR HANDLING & RESILIENCE
// ===========================================================================

/**
 * Fetch with exponential backoff and fallback support
 * @param {string} url - The URL to fetch
 * @param {*} fallbackData - Data to return if all retries fail
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<*>} The fetched data or fallback
 */
async function fetchWithFallback(url, fallbackData = null, maxRetries = 2) {
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            lastError = error;
            console.warn(`[Fetch] Attempt ${i + 1}/${maxRetries} failed for ${url}:`, error.message);

            if (i < maxRetries - 1) {
                // Exponential backoff: 1s, 2s, 4s...
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
    }

    console.error(`[Fetch] All ${maxRetries} attempts failed for ${url}. Using fallback.`);
    return fallbackData;
}

/**
 * Create an error UI component for failed data loading
 * @param {string} message - Error message to display
 * @param {Function} retryCallback - Function to call on retry
 * @returns {string} HTML string for error state
 */
function createErrorUI(message, retryCallback) {
    const retryId = `retry-${Date.now()}`;

    // Store callback for retry button and ensure cleanup
    window[retryId] = () => {
        retryCallback();
        delete window[retryId];
    };

    return `
    <div class="error-state" role="alert" aria-live="polite">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <h3 class="error-title">Loading Failed</h3>
      <p class="error-message">${escapeHTML(message)}</p>
      <button 
        class="retry-btn" 
        onclick="window['${retryId}']()"
        aria-label="Retry loading content"
      >
        🔄 Retry
      </button>
    </div>
  `;
}

/**
 * Create a loading skeleton UI
 * @param {number} count - Number of skeleton items
 * @param {string} type - Type of skeleton ('card', 'list', 'text')
 * @returns {string} HTML string for skeleton loading state
 */
function createSkeletonUI(count = 3, type = 'card') {
    let html = '<div class="skeleton-container">';

    for (let i = 0; i < count; i++) {
        if (type === 'card') {
            html += `
        <div class="skeleton-card" style="animation-delay: ${i * 0.1}s">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-40"></div>
        </div>
      `;
        } else if (type === 'list') {
            html += `
        <div class="skeleton-list-item">
          <div class="skeleton-line w-70"></div>
          <div class="skeleton-line w-40"></div>
        </div>
      `;
        } else {
            html += `<div class="skeleton-line"></div>`;
        }
    }

    html += '</div>';
    return html;
}

// ===========================================================================
// ACCESSIBILITY UTILITIES
// ===========================================================================

/**
 * Announce a message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
function announceToScreenReader(message, priority = 'polite') {
    const announcement = document.getElementById('sr-announcer');
    if (announcement) {
        announcement.setAttribute('aria-live', priority);
        announcement.textContent = message;

        // Clear after announcement
        setTimeout(() => {
            announcement.textContent = '';
        }, 1000);
    }
}

/**
 * Initialize screen reader announcer element
 */
function initScreenReaderAnnouncer() {
    if (!document.getElementById('sr-announcer')) {
        const announcer = document.createElement('div');
        announcer.id = 'sr-announcer';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
    }
}

// ===========================================================================
// SEARCH OPTIMIZATION
// ===========================================================================

/**
 * Fuzzy match search query against target text
 * Returns true if characters of query appear in text in the same order
 */
function fuzzyMatch(query, text) {
    if (!query) return true;
    if (!text) return false;
    
    const lowerQuery = query.toLowerCase().replace(/\\s+/g, '');
    const lowerText = text.toLowerCase();
    
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length; i++) {
        if (lowerText[i] === lowerQuery[queryIndex]) {
            queryIndex++;
            if (queryIndex === lowerQuery.length) return true;
        }
    }
    return false;
}

/**
 * Highlight matched terms in text for search results
 */
function highlightText(text, query) {
    if (!query || !text) return escapeHTML(text);
    
    const escapedText = escapeHTML(text);
    // Simple word-based highlighting
    const terms = query.toLowerCase().trim().split(/\\s+/).filter(t => t.length > 0);
    
    if (terms.length === 0) return escapedText;
    
    // Create a regex to match any of the terms
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})`, 'gi');
    
    return escapedText.replace(regex, '<span class="search-highlight">$&</span>');
}

// ===========================================================================
// 1. DARK MODE LOGIC
// ===========================================================================
function initSharedTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (!toggleBtn) return;

    const sunIcon = `<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000 1.41.996.996 0 001.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06z"/></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24"><path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>`;

    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    toggleBtn.innerHTML = savedTheme === 'dark' ? sunIcon : moonIcon;

    toggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        toggleBtn.innerHTML = newTheme === 'dark' ? sunIcon : moonIcon;
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

function sanitizeURL(url) {
    if (!url) return '#';
    try { return ['http:', 'https:'].includes(new URL(url).protocol) ? url : '#'; }
    catch { return '#'; }
}

document.addEventListener('DOMContentLoaded', initSharedTheme);
