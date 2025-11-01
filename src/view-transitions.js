/**
 * View Transitions API
 *
 * Provides smooth page transitions using the browser's View Transitions API.
 * Falls back gracefully for browsers that don't support it.
 */

/**
 * Navigate to a URL with a view transition
 * @param {string} url - The URL to navigate to
 */
async function navigateWithTransition(url) {
  // Check if View Transitions API is supported
  if (!document.startViewTransition) {
    // Fallback: regular navigation
    window.location.href = url;
    return;
  }

  // Fetch the new page
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Parse the new page
    const parser = new DOMParser();
    const newDocument = parser.parseFromString(html, 'text/html');

    // Start the view transition
    const transition = document.startViewTransition(() => {
      // Update the page content
      document.body.innerHTML = newDocument.body.innerHTML;

      // Update the page title
      document.title = newDocument.title;

      // Update browser history
      window.history.pushState({}, '', url);

      // Re-initialize any components that need it
      reinitializeComponents();
    });

    await transition.finished;
  } catch (error) {
    console.error('View transition failed:', error);
    // Fallback to regular navigation on error
    window.location.href = url;
  }
}

/**
 * Re-initialize components after page transition
 */
function reinitializeComponents() {
  // Re-run theme initialization
  const themeScript = document.querySelector('script[src*="theme"]');
  if (themeScript) {
    import('./theme.js');
  }

  // Scroll to top
  window.scrollTo(0, 0);

  // Re-attach event listeners for new page
  attachNavigationListeners();
}

/**
 * Attach click listeners to internal links for view transitions
 */
function attachNavigationListeners() {
  // Get all internal links
  const links = document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]');

  links.forEach(link => {
    // Skip if already has listener
    if (link.dataset.viewTransition) return;

    link.dataset.viewTransition = 'true';

    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      // Skip if:
      // - Ctrl/Cmd/Shift key is pressed (user wants new tab)
      // - It's a hash link (anchor within page)
      // - It's an external link
      // - It has download attribute
      // - It has target="_blank"
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        href.startsWith('#') ||
        link.hasAttribute('download') ||
        link.target === '_blank' ||
        link.host !== window.location.host
      ) {
        return;
      }

      e.preventDefault();

      // Get the full URL
      const url = new URL(href, window.location.href).href;

      // Navigate with transition
      navigateWithTransition(url);
    });
  });
}

/**
 * Handle browser back/forward buttons
 */
function handlePopState() {
  window.addEventListener('popstate', () => {
    if (document.startViewTransition) {
      navigateWithTransition(window.location.href);
    } else {
      window.location.reload();
    }
  });
}

/**
 * Initialize view transitions
 */
function initViewTransitions() {
  // Only enable for browsers that support View Transitions API
  if (!document.startViewTransition) {
    console.log('View Transitions API not supported');
    return;
  }

  // Attach listeners to current page links
  attachNavigationListeners();

  // Handle browser back/forward
  handlePopState();

  console.log('View Transitions enabled');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initViewTransitions);
} else {
  initViewTransitions();
}

export { navigateWithTransition };
