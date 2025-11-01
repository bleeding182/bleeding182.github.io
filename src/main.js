/**
 * Material Web Components entry point
 * This file imports only the Material 3 components used in the blog.
 * Keeps bundle size minimal by importing only what's needed.
 */

// Buttons
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';

// Icon buttons for navigation
import '@material/web/iconbutton/icon-button.js';

// List items for navigation/content
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';

// Divider for separating content
import '@material/web/divider/divider.js';

// Theme management for light/dark mode toggle
import './theme.js';

console.log('Material Web components loaded');
