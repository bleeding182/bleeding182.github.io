# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal Android development blog powered by Jekyll and hosted on GitHub Pages. The site is available at https://blog.davidmedenjak.com.

The site uses Material 3 (Material Web Components) for UI, with automatic light/dark theme support based on system preferences.

## Development Commands

### Initial Setup
```bash
# Install Ruby dependencies
bundle install

# Install Node.js dependencies
npm install

# Build JavaScript bundle
npm run build:js
```

### Build and Serve
- `bundle exec jekyll serve` - Build the site and serve it locally at http://localhost:4000
- `npm run build:js` - Build the Material Web components JavaScript bundle
- `npm run watch:js` - Watch for changes and rebuild JavaScript automatically
- `guard` - Enable live reloading while editing (optional)

### Full Development Workflow
```bash
# Terminal 1: Watch and rebuild JavaScript
npm run watch:js

# Terminal 2: Serve Jekyll site
bundle exec jekyll serve

# Terminal 3 (optional): Live reload
guard
```

Note: Changes to `_config.yml` require restarting the Jekyll server.

## Site Architecture

### Content Structure
- **Blog posts**: Located in `_posts/` directory
  - Named with format: `YYYY-MM-DD-title.{md,markdown}`
  - Front matter includes: `layout`, `title`, `categories`, `tags`
  - Primarily focused on Android development topics

- **Layouts**: Located in `_layouts/`
  - `default.html` - Base layout with header and tag manager
  - `post.html` - Blog post layout with Disqus comments (production only)
  - `page.html` - For standalone pages
  - `about.html` - About page layout

- **Includes**: Located in `_includes/`
  - `head.html` - HTML head with metadata
  - `header.html` - Site header/navigation
  - `footer.html` - Site footer
  - `paginated_posts.html` - Homepage post listing
  - `tag-manager.html` - Analytics integration

### Styling
- Uses Material 3 (Material Web Components)
- SASS files in `_sass/` directory
  - `_sass/theme.scss` - Material 3 design tokens and theming
  - `_sass/syntax-highlighting.scss` - Code syntax highlighting
- Main stylesheet: `css/site.scss`
- Material 3 theme colors:
  - Primary: `#AF0B0B` (red)
  - Secondary: `#D9721C` (orange)
  - Supports automatic light/dark themes via `prefers-color-scheme`
- SASS output style: compressed

### JavaScript
- Material Web components bundled via Rollup
- Entry point: `src/main.js`
- Output: `assets/bundle.js` (minified, ~77KB)
- Only includes needed components:
  - Buttons (filled, outlined, text)
  - Icon buttons
  - List items
  - Dividers

### Custom Fonts
- Self-hosted fonts in `/fonts` directory
- Font declarations in `css/fonts.css`
- Includes Roboto and Roboto Condensed variants

### Jekyll Configuration
- Jekyll version: 4.4.1
- Markdown engine: kramdown
- Pagination: 8 posts per page
- Future posts enabled: `future: true`
- Plugins: `jekyll-sitemap`, `jekyll-paginate`, `jekyll-feed`, `jekyll-seo-tag`
- Excluded from build: `CNAME`, `README.md`, `Guardfile`, `Gemfile`, `Gemfile.lock`

### Build Output
- CSS: `_site/css/site.css` (~12KB compressed)
- JavaScript: `_site/assets/bundle.js` (~77KB minified)
- Total assets: ~89KB (excluding fonts and images)

## Working with Blog Posts

When creating new blog posts:
1. Create file in `_posts/` with format `YYYY-MM-DD-title.md`
2. Include front matter:
   ```yaml
   ---
   layout: post
   title: "Your Title"
   categories: android
   tags:
   - android
   - specific-topic
   ---
   ```
3. Use standard markdown for content
4. Jekyll will automatically generate the post page and add it to the index

## Local Development Workflow

1. Start JavaScript watch mode: `npm run watch:js` (Terminal 1)
2. Start Jekyll server: `bundle exec jekyll serve` (Terminal 2)
3. Optional: Start guard for live reload: `guard` (Terminal 3)
4. Edit files - changes will trigger automatic rebuild
5. View changes at http://localhost:4000

Remember:
- `_config.yml` changes require Jekyll server restart
- JavaScript changes are automatically rebuilt by watch mode
- SASS changes are automatically rebuilt by Jekyll

## Deployment

The site is deployed to GitHub Pages. To deploy:
1. Ensure JavaScript bundle is built: `npm run build:js`
2. Commit changes including `assets/bundle.js`
3. Push to `master` branch
4. GitHub Pages will build and deploy automatically

Note: The generated bundle files (`assets/bundle.js` and `assets/bundle.js.map`) should be committed to the repository for GitHub Pages deployment.
