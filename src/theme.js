/**
 * Theme management for light/dark mode toggle
 *
 * The stylesheet is the source of truth: with no `data-theme` attribute the
 * `prefers-color-scheme` media queries decide. We only set the attribute once
 * the reader has explicitly picked a theme, so "follow the system" keeps
 * working for as long as they never touch the toggle.
 */

const STORAGE_KEY = 'theme';

const BACKGROUNDS = {
  light: '#FFF8F6',
  dark: '#1A1110',
};

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch (e) {
    // Private browsing / storage disabled - fall back to the system theme.
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// The theme actually in effect, whether pinned or inherited from the system.
function getThemePreference() {
  return getStoredTheme() || getSystemTheme();
}

/**
 * Dark Reader inverts pages it believes are light. Two cases need the lock:
 * we are dark, where it would double-darken and swap the colours; and the reader
 * pinned a theme, where their explicit choice outranks the extension - a pinned
 * light theme is still a choice, and without the lock Dark Reader overrides it.
 *
 * Following the system in light is the one case we leave alone, which is why this
 * stays dynamic rather than hardcoded in the markup.
 *
 * Dark Reader reads the lock as the document loads, so toggling cannot rescue a
 * page it has already inverted; head.html sets the lock before first paint and
 * this keeps it in step for the next navigation.
 */
function syncDarkReaderLock(theme, isPinned) {
  const existing = document.querySelector('meta[name="darkreader-lock"]');

  if (isPinned || theme === 'dark') {
    if (!existing) {
      const meta = document.createElement('meta');
      meta.name = 'darkreader-lock';
      document.head.appendChild(meta);
    }
  } else if (existing) {
    existing.remove();
  }
}

/**
 * The two media-gated theme-color tags in head.html cover the no-JS case. Once a
 * theme is pinned they would report the system theme instead, so replace them
 * with a single unconditional tag.
 */
function syncThemeColor(theme, isPinned) {
  if (!isPinned) return;

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());

  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = BACKGROUNDS[theme];
  document.head.appendChild(meta);
}

// Reflect the current preference into the DOM without persisting anything.
function syncTheme() {
  const stored = getStoredTheme();
  const theme = stored || getSystemTheme();

  if (stored) {
    document.documentElement.setAttribute('data-theme', stored);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  syncDarkReaderLock(theme, Boolean(stored));
  syncThemeColor(theme, Boolean(stored));

  return theme;
}

// Pin a theme; this is the only path that writes to storage.
function applyTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    // Storage unavailable - the attribute below still applies for this page view.
  }

  document.documentElement.setAttribute('data-theme', theme);
  syncDarkReaderLock(theme, true);
  syncThemeColor(theme, true);
}

function toggleTheme() {
  applyTheme(getThemePreference() === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  syncTheme();

  const toggleButton = document.getElementById('theme-toggle');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleTheme);
  }

  // With no stored preference the CSS follows the system on its own; we only
  // need to keep the Dark Reader lock and theme-color in step.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!getStoredTheme()) {
        syncTheme();
      }
    });
  }
}

/**
 * Header elevation is CSS (`animation-timeline: scroll()`, see _header.scss);
 * this is only the fallback for browsers without it, currently Firefox.
 *
 * The condition must stay identical to the `@supports` guard in _header.scss.
 * They are the two halves of one switch: if both are true the class fights the
 * animation, and if both are false the header stays invisible against the page
 * background. Treating a missing `CSS.supports` as unsupported errs towards
 * this path, which works everywhere rather than only on modern engines.
 */
function initScrollBehavior() {
  const supportsScrollTimeline =
    typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'scroll()');
  if (supportsScrollTimeline) return;

  const header = document.querySelector('.top-app-bar');
  if (!header) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    header.classList.toggle('scrolled', scrollTop > 20);
  }, { passive: true });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initScrollBehavior();
  });
} else {
  initTheme();
  initScrollBehavior();
}

export { toggleTheme, applyTheme, getThemePreference };
