# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal Android development blog powered by Jekyll and hosted on GitHub Pages. The site is available at https://blog.davidmedenjak.com.

The site uses Material 3 (Material Web Components) for UI. It follows the system light/dark preference by default, with a header toggle to pin either theme.

## Development Commands

### Initial Setup

```bash
bin/setup
```

Idempotent - re-run it any time gems or packages look stale. It checks the Ruby
version, installs the pinned bundler, installs gems into `vendor/bundle`, runs
`npm ci` and builds the JS bundle.

Prerequisites:
- Ruby, at the version in `.ruby-version`. With rbenv: `rbenv install $(cat .ruby-version)`.
- Node 22 or newer (CI builds on 22).

The Ruby version is pinned by `.ruby-version` and read by both rbenv and CI
(`ruby-version-file:` in the workflow), so local and CI can't drift. If `ruby -v`
in this directory doesn't match that file, rbenv isn't hooked into your shell -
`eval "$(rbenv init - bash)"` needs to be in your profile. Without it rbenv falls
back to the global Ruby, which is the usual cause of `bundle install` failing here.

Gems are vendored into `vendor/bundle` via a local bundler config, so this project
never collides with another project's gems. Both `vendor/` and `.bundle/` are
gitignored.

### Build and Serve
- `bundle exec jekyll serve` - Build the site and serve it locally at http://localhost:4000
- `npm run build:js` - Build the Material Web components JavaScript bundle
- `npm run watch:js` - Watch for changes and rebuild JavaScript automatically

### Full Development Workflow

```bash
bin/serve            # http://localhost:4000
bin/serve --port 4001
```

One command: builds the bundle, watches it for changes, and serves Jekyll with
livereload, shutting everything down together on Ctrl-C. This replaces the old
three-terminal setup; `guard` and `guard-livereload` are gone in favour of
Jekyll's built-in `--livereload`.

Note: Changes to `_config.yml` require restarting the Jekyll server.

## Site Architecture

### Content Structure
- **Blog posts**: Located in `_posts/` directory
  - Named with format: `YYYY-MM-DD-title.{md,markdown}`
  - Front matter includes: `layout`, `title`, `categories`, `tags`
  - Primarily focused on Android development topics

- **Layouts**: Located in `_layouts/`
  - `default.html` - Base layout with header
  - `post.html` - Blog post layout
  - `page.html` - For standalone pages
  - `about.html` - About page layout

- **Includes**: Located in `_includes/`
  - `head.html` - HTML head; metadata comes from `{% seo %}` and `{% feed_meta %}`
  - `header.html` - Site header/navigation
  - `paginated_posts.html` - Homepage post listing

### Styling
- Uses Material 3 (Material Web Components)
- SASS files in `_sass/` directory
  - `_sass/theme.scss` - Material 3 design tokens and theming
  - `_sass/syntax-highlighting.scss` - Code syntax highlighting
- Main stylesheet: `css/site.scss`
- Material 3 theme colors:
  - Primary: `#AF0B0B` (red)
  - Secondary: `#D9721C` (orange)
- SASS output style: compressed

#### Theming rules

The theme follows the system by default and can be pinned via the header toggle.
Three selectors carry the theme, and anything theme-dependent must cover all three:

- `:root` - light palette, `color-scheme: light dark`
- `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` - system dark
- `:root[data-theme="dark"]` - pinned dark

The dark values live in the `dark-palette` mixin (`_sass/theme.scss`) and the
`dark-tokens` mixin (`_sass/tokens.scss`) so the last two can't drift. Add new dark
values to the mixin, never to a single selector.

Absence of `data-theme` means "follow the system" - `theme.js` only sets the
attribute once the reader has explicitly toggled. Don't write to `localStorage` on
load; that silently pins the theme and breaks system-following.

Every color must resolve through a `--blog-*` or `--md-sys-color-*` token. Hardcoded
hex/rgba in component SASS will be wrong in one of the two themes.

`color-scheme` also drives native scrollbars and form controls, and it is what tells
Dark Reader the page is already dark. On top of that, `<meta name="darkreader-lock">`
is set whenever the reader pinned a theme **or** the resolved theme is dark, and only
omitted when we follow the system into light. Both conditions matter:

- dark, so Dark Reader does not invert an already-dark page
- pinned, because an explicit choice outranks the extension - a pinned *light* theme
  is still a choice, and without the lock Dark Reader inverts it on every page load

Gating the lock on dark alone was a bug: pinning light then navigating handed every
subsequent page to Dark Reader, which inverted it into a red-tinted dark.

The decision has to be made in the inline script in `head.html`. Dark Reader reads
the lock as the document loads, so a lock added later from the bundle is too late for
that page view, and toggling cannot rescue a page it has already inverted -
`syncDarkReaderLock` in `theme.js` only keeps the tag in step for the next navigation.
Don't hardcode the lock in the markup either; following the system into light is the
one case Dark Reader should still handle.

#### Header elevation

The sticky header is elevated by scroll position, in CSS, from
`_sass/components/_header.scss`: a `header-elevation` keyframe attached to the bar
with `animation-timeline: scroll(root block)`, ramped in over
`animation-range: 0 64px`.

Browsers without scroll-driven animations (currently Firefox) fall back to the old
`.scrolled` class toggled by a scroll listener in `theme.js`. **The two paths are one
switch and must stay in sync**: the `@supports (animation-timeline: scroll())` guard
in the SASS and the `CSS.supports('animation-timeline', 'scroll()')` call in
`initScrollBehavior` test the same string. If they ever disagree you get both paths
at once (a permanently elevated bar) or neither (an invisible one).

This is load-bearing, not decoration. `--blog-color-surface` is the *same colour* as
the page background in both themes, so an un-elevated bar is invisible - content
scrolling underneath it just looks clipped. `--blog-color-surface-elevated` plus
`--blog-shadow-md` are the only things separating the two, which is why the failure
mode of this effect must always be "elevated", never "flat".

Details worth keeping in mind before editing it:

- Only a `to` keyframe is declared. The resting values stay on the `.site-header,
  .top-app-bar` rule and exist in exactly one place. The old implementation
  duplicated the elevated state verbatim into `css/site.scss`; don't reintroduce that.
- The `animation` shorthand resets `animation-timeline` and `animation-range`, so
  both have to be declared after it.
- `animation-duration` is `1ms`, not `auto`; the scroll timeline supplies the
  progress, so the declared duration only has to be non-zero. Support is Chromium
  115+ and Safari 26+; Firefox has it behind a flag in Nightly.
- Mobile (`max-width: 768px`) sets `position: static` and switches off *both* paths -
  `animation: none` and a `.scrolled` override back to the resting values. The bar
  scrolls away with the content there, so there is nothing to elevate above, and
  `theme.js` has no notion of the breakpoint so it keeps adding the class.
- No `prefers-reduced-motion` guard: nothing moves, it is a colour and shadow
  crossfade. Suppressing it would hand reduced-motion readers the invisible header.
- `var()` inside the keyframe re-resolves live, so toggling the theme while scrolled
  repaints the elevated bar correctly. Verified in all three theme states.

### JavaScript
- Material Web components bundled via Rollup
- Entry point: `src/main.js`
- Output: `assets/bundle.js` (minified, ~81KB)
- Only includes needed components:
  - Buttons (filled, outlined, text)
  - Icon buttons
  - List items
  - Dividers

`src/theme.js` is the only hand-written script in the bundle. It does theming - read
the stored preference, keep `data-theme`, the Dark Reader lock and the `theme-color`
tags in step, wire up the toggle - plus `initScrollBehavior`, which is dead code on
any browser that supports scroll-driven animations and only attaches a listener as
the header-elevation fallback (see [Header elevation](#header-elevation)).

Nothing else should be added here that CSS can express.

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
- Excluded from build: see `exclude:` in `_config.yml` (`bin`, `src`, `vendor`, tooling configs)
- The RSS/Atom feed at `/feed.xml` is generated by `jekyll-feed`; there is no hand-written template

### Build Output
- CSS: `_site/css/site.css` (~12KB compressed)
- JavaScript: `_site/assets/bundle.js` (~81KB minified)
- Total assets: ~93KB (excluding fonts and images)

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

## Deployment

Push to `main`; `.github/workflows/jekyll.yml` builds the JS bundle, builds
Jekyll and deploys. There is no manual build step.

The generated bundle (`assets/bundle.js` and its sourcemap) is **not** committed.
CI runs `npm run build:js` before Jekyll, so the deployed artifact is always built
fresh; committing it only produced ~80KB of diff noise and merge conflicts.

This site does not use the `github-pages` gem and should not: it hard-pins Jekyll
3.10 and older plugins. Deployment goes through the Actions workflow instead, which
is why running Jekyll 4.4 is possible.
