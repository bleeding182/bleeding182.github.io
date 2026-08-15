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

**Colours are written once, as a `(light, dark)` pair in a map.** Each pair is
emitted twice - the light value plainly, the `light-dark()` pair behind a
`@supports` gate:

```scss
$palette: (
  'md-sys-color-surface': (#FFF8F6, #1A1110),
);

:root {
  color-scheme: light;
  @include ld.light($palette);        // --md-sys-color-surface: #FFF8F6;
}

@include ld.when-supported {          // @supports (color: light-dark(#000, #fff))
  :root {
    color-scheme: light dark;
    @include ld.themed($palette);     // --md-sys-color-surface: light-dark(...);
  }
  :root[data-theme="light"] { color-scheme: light; }
  :root[data-theme="dark"]  { color-scheme: dark; }
}
```

**Add a colour by adding one map entry.** There is no dark palette to keep in sync -
no mixin per theme, no `prefers-color-scheme` block, no second selector, and no
hand-written fallback. Pinning a theme narrows `color-scheme` and the whole palette
follows, live, without a repaint hook or a reload. The Material tokens live in
`_sass/theme.scss` (`$palette`), the `--blog-*` tokens in `_sass/tokens.scss`
(`$themed`); the three mixins are in `_sass/_light-dark.scss`.

Rules that come with it:

- `light-dark()` resolves against the element's *used* `color-scheme`. That works
  only because `color-scheme` is declared on `:root` and nowhere else. **Never set
  `color-scheme` further down the tree** - it would flip that subtree's colours
  while the rest of the page stays put.
- It takes **colours, not values**. A multi-part value can't go in the map; lift the
  colour into its own token instead, as the shadows do -
  `--blog-shadow-md: 0 2px 4px var(--blog-shadow-color-md)`, with only
  `--blog-shadow-color-md` themed.
- Nesting is fine, including through `var()`: `--blog-color-code-bg` pairs
  `var(--md-sys-color-surface-container)` with `var(--md-sys-color-surface-container-low)`,
  and those tokens are themselves themed.
- Every colour must still resolve through a `--blog-*` or `--md-sys-color-*` token.
  Hardcoded hex/rgba in component SASS will be wrong in one of the two themes.
- **`@supports` is the only fallback that works here, and it is not optional.** The
  usual two-declaration pattern does nothing for custom properties: they accept any
  token stream, so `--x: light-dark(a, b)` parses fine on a browser that has never
  heard of it and simply overrides the plain declaration before it. The failure
  surfaces later, at `var()` substitution, as invalid-at-computed-value-time, which
  takes the property down instead of falling back. Skip the gate and the *entire*
  palette collapses to transparent backgrounds and black text below
  Chrome/Edge 123 / Firefox 120 / Safari 17.5 (May 2024) - measured, not theorised.
- Under that floor the site is **light-only**, including `color-scheme`. Don't
  declare `color-scheme: light dark` or a `[data-theme]` override outside the gate:
  a browser that can't paint the dark palette shouldn't be handed dark scrollbars
  and form controls on a light page.

**What still needs `data-theme`: everything that is not a colour.** There is no
selector that matches the used `color-scheme`, and `prefers-color-scheme` reports
the OS, which a pinned theme is allowed to contradict. So a non-colour that depends
on the theme still needs all three selectors, and they still have to agree:

- the base rule (light)
- `:root[data-theme="dark"]` - pinned dark
- `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` - system dark

The sun/moon swap in `_sass/components/_header.scss` is the only such case today; it
toggles `display`, which `light-dark()` cannot express. Anything else non-colour -
an icon, a `background-image`, a `border-style` - joins it in that shape. Add a
colour and you touch one map entry; add a non-colour and you touch three places.

`data-theme` is also what `theme.js` and the pre-paint script in `head.html` read to
tell "pinned" from "following the system", which the Dark Reader lock below depends
on. It is not redundant with `color-scheme`.

Absence of `data-theme` means "follow the system" - `theme.js` only sets the
attribute once the reader has explicitly toggled. Don't write to `localStorage` on
load; that silently pins the theme and breaks system-following.

With no `data-theme`, `:root` computes `color-scheme: light dark` in both schemes -
it advertises support for both and the browser resolves it. Only a pinned theme
computes a single keyword. Native scrollbars and form controls follow the *used*
scheme either way, as does `light-dark()`.

`color-scheme` is also what tells Dark Reader the page is already dark. On top of
that, `<meta name="darkreader-lock">`
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

`rollup.config.js` builds into `assets/.tmp/` and only `rename(2)`s the result into
`assets/bundle.js` once it's complete (a `writeBundle` plugin hook). Jekyll's default
entry filter never walks into dot-prefixed paths, so it can't observe the file
mid-write; combined with the atomic rename, `bin/serve`'s watcher (`rollup -c -w`)
can never hand Jekyll a truncated bundle to copy into `_site`. Without this, an empty
`assets/bundle.js` gets served silently - no error, just every JS feature on the page
going dead until the next edit. `assets/.tmp/` is gitignored and should normally be
empty between builds.

`src/theme.js` is the only hand-written script in the bundle. It does theming - read
the stored preference, keep `data-theme`, the Dark Reader lock and the `theme-color`
tags in step, wire up the toggle - plus `initScrollBehavior`, which is dead code on
any browser that supports scroll-driven animations and only attaches a listener as
the header-elevation fallback (see [Header elevation](#header-elevation)).

Nothing else should be added here that CSS can express.

### Custom Fonts
- Self-hosted fonts in `/fonts` directory
- Font declarations in `css/fonts.css`, preloaded from `_includes/head.html`
- Two files serve the whole site: **Roboto Flex** (`--blog-font-display` and
  `--blog-font-body`) and **Fira Code** (`--blog-font-mono`). Both are variable,
  so every weight the SASS asks for - 300 through 900 - comes out of one request
  each. There is no static Roboto any more; adding a weight costs nothing.
- `font-stretch` drives Roboto Flex's `wdth` axis (25-151). That axis is why the
  display font has to stay variable.
- **Preloads and `@font-face` have to be kept in step.** A font is otherwise
  discovered three levels deep - document, then `fonts.css`, then the file - and
  the preload is the only thing that collapses that. Preload only fonts actually
  matched by rendered text; `MaterialIcons` is declared but never matched, which
  is why it isn't preloaded. `crossorigin` is required even same-origin, or the
  preload is discarded and the font fetched twice.
- `roboto-condensed-v25-*` and MaterialIcons' `.eot`/`.ttf`/`.woff` are unreferenced
  leftovers, still in the repo but never served.

### Favicon

Three files at the site root, because no one format covers everything:

| file | who needs it |
|---|---|
| `favicon.svg` | Chrome 80+, Firefox 41+, Safari 26+ |
| `favicon.ico` | every older Safari, plus anything that never reads the markup |
| `apple-touch-icon.png` | iOS home screen, Android's fallback with no manifest |

A `D` on a squircle in the brand red, with the glyph baked in as a `<path>` - a favicon
renders outside the document, so `fonts.css` never applies to it. The SVG carries a
`prefers-color-scheme` block and flips to the dark palette; the two raster files are
light-only, which is why the tile is opaque rather than a bare glyph. They were
generated once and are not regenerated by the build. Replacing the icon means drawing a
new one, not editing these.

`favicon.ico` holds 16/32/48px PNG frames. It has to keep that exact name and location:
`/favicon.ico` is fetched implicitly by feed readers, chat unfurlers and crawlers that
never parse a `<link>`. 48px is there for Google's search results.

The `sizes="32x32"` on the ICO's `<link>` is load-bearing - it is what makes SVG-capable
browsers prefer the vector rather than weighing the two and settling on the ICO.

### Comments never reach the browser

Three mechanisms, because no single one covers everything:

- **In templates, use `{% comment %}`, not `<!-- -->`.** Liquid comments are
  stripped at build; HTML comments are markup and ship to every reader.
- **CSS comments are stripped by Sass** (`style: compressed`), which is why
  `css/fonts.scss` is a `.scss` with front matter rather than a plain `.css`.
  Front matter is the only thing routing it through Sass - drop it and Jekyll
  copies the file verbatim, comments and all. The output URL stays `/css/fonts.css`.
- **`_plugins/strip_html_comments.rb`** catches what we don't write:
  jekyll-seo-tag's Begin/End pair and the `<!--more-->` left behind by
  `excerpt_separator`. Neither is configurable.

The plugin deliberately skips `<pre>`, `<script>` and `<textarea>` - a comment in
there is content, not markup. `tools/banner_generator.html` depends on this: it
builds Android vector XML, comments and all, inside a JS template literal, and
stripping those would corrupt what the tool hands the user.

A page only gets the plugin if Jekyll renders it. A file with no front matter is
copied verbatim as a static asset, which is why `tools/banner_generator.html`
carries `layout: null` - enough to be rendered, without the site chrome that
`defaults:` would otherwise wrap around a standalone document.

This is done with a plugin rather than a minifier gem; jekyll-minifier would also
re-minify `assets/bundle.js` through uglifier, which is ES5-only and would choke on
an ES module bundle. Custom plugins work here only because deployment goes through
the Actions workflow rather than GitHub Pages' safe mode.

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
