# Mobile-first Refactor Audit (Strict)

## 1) Non-Conformance List

| # | Where (file + selector) | Why it breaks mobile or consistency | Consolidation target (change X to Y) |
|---|---|---|---|
| 1 | `frontend/src/styles.css` - `html, body` | Default `overflow: hidden` creates nested scroll traps and body-level lock. Mobile unlock is at `820px`, while most component breakpoints are `768px`, so behavior flips inconsistently between 768-820. | Change to mobile-first defaults: `overflow-x: hidden; overflow-y: auto;` at base. Move desktop lock to `@media (min-width: 64rem)` only. |
| 2 | `frontend/src/styles.css` - global baseline missing (`*`, `*::before`, `*::after`) | No global `box-sizing` reset means width math differs by component and causes edge overflow when padding/borders are added. | Add global reset: `*,*::before,*::after { box-sizing: border-box; }` and set baseline `line-height` on `body`. |
| 3 | `frontend/src/styles.css :root` and `frontend/src/app/features/music-player/components/playlist-panel/styles/design-system.css :root` | Design tokens are duplicated in two places, increasing drift risk and making spacing/color updates inconsistent. | Keep tokens only in `frontend/src/styles.css`; remove duplicate `:root` token block from `design-system.css`. |
| 4 | `frontend/src/app/app.component.css` - `.app-layout` | Uses `min-height: 100vh`, which is unstable on mobile browser UI chrome changes. | Change to `min-height: 100dvh` with `100vh` fallback. |
| 5 | `frontend/src/app/app.component.css` - `.main-content` | Flex container lacks `min-height: 0`, which can block child scroll regions and force overflow clipping. | Add `min-height: 0` so routed layouts can shrink and scroll correctly. |
| 6 | `frontend/src/app/app.component.css` - `.footer-container` | Footer is not stabilized for mobile and has no safe-area handling, so controls can sit under iOS gesture area. | Mobile base: make footer sticky with safe-area padding. Desktop (`>=1024px`): restore static desktop presentation. |
| 7 | `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css` - `.youtube-container` | Selector is stale (not present in template), so intended shell constraints are not applied to actual root. | Change selector target to `:host` or `.platform-shell` to style actual shell root. |
| 8 | `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css` - `.content` | `height: calc(100vh - 200px)` is a magic number that breaks with dynamic header/footer height and mobile viewport changes. | Base: `height: auto; min-height: 0;`. Desktop: restore explicit height with `100dvh` and tokenized chrome offset. |
| 9 | `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css` - `.content` | `overflow: hidden` at base clips child overflow and can hide controls/list content on small screens. | Base: `overflow: visible`; desktop-only: `overflow: hidden` for internal panel scroll behavior. |
| 10 | `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css` - `app-playlist-panel` (`min-width: 300px` / `350px`) | Hard min-widths force horizontal pressure on narrow devices and split-view windows. | Base: `min-width: 0; width: 100%;`. Desktop (`>=1024px`): reintroduce bounded min-width with `minmax()` grid constraints. |
| 11 | `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css` - `app-playlist-panel:has(.song-list.*)` and mobile fixed heights | `:has()`-driven layout and fixed min-heights (`280/320/400/450px`) overfit content and device size; brittle in WebView/mobile browsers. | Remove `:has()` sizing for layout. Use content-neutral layout with `flex` and optional `max-height: clamp(...)` only where needed. |
| 12 | `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/playlist-panel-header/playlist-panel-header.component.css` - `.playlist-selector`, `.shuffle-btn` | `min-width: 12.5rem` and fixed flex basis force overflow/wrapping artifacts on narrow screens. | Base: set `min-width: 0`, full-width controls in one column. Desktop: restore fixed visual width at `>=64rem`. |
| 13 | `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/playlist-panel-header/playlist-panel-header.component.css` - `.playlist-selector > app-playlist-selector { display: contents; }` | `display: contents` is fragile for form controls/accessibility and can behave inconsistently in Safari/WebViews. | Replace with `display: block; min-width: 0;` and manage width via parent flex/grid. |
| 14 | `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/playlist-selector/playlist-selector.component.css` - `.playlist-dropdown select, .playlist-dropdown::after` | `.playlist-dropdown` is applied to `<select>`, so nested `select` selector is dead, and pseudo-element styling on native select is unreliable. | Move all visual styles directly to `.playlist-dropdown`; remove dead nested selector and pseudo-element branch. |
| 15 | `frontend/src/app/features/music-player/components/playlist-panel/styles/playlist-panel.css` and `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-list/song-list.component.css` - `.items` duplication | List spacing/overflow rules are split across two files, causing overrides and unpredictable list height on mobile. | Consolidate `.items` scrolling/layout in `song-list.component.css`; keep container-only visuals in `playlist-panel.css`. |
| 16 | `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-list/song-list.component.css` - `.items` mobile `max-height: 60vh` | Hard cap can truncate list usability on short devices and conflicts with shell/panel height logic. | Remove fixed `60vh`; rely on flex with `min-height: 0` and parent layout constraints. |
| 17 | `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-item/song-item.component.css` - `.item` layout | `justify-content: space-between` with inline controls causes text/control collisions when local controls are present. | Change row to grid columns (`thumb`, `text`, `actions`) and add explicit `.item-actions` wrapper in template. |
| 18 | `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-item/song-item.component.css` - mobile overrides using `!important` | Heavy `!important` in hover/active overrides indicates specificity debt and blocks clean breakpoint layering. | Remove `!important` overrides; gate hover transitions with `@media (hover: hover) and (pointer: fine)`. |
| 19 | `frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/transport-controls/transport-controls.component.css` and `frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/volume-control/volume-control.component.css` - duplicate `.btn-control` | Same button primitive is defined in two files, which causes drift and inconsistent interaction states. | Extract shared control-button primitive in one place (player-controls shared stylesheet) and reference from both sections. |
| 20 | `frontend/src/app/features/music-player/components/footer/player-controls/player-controls.component.css` - `.controls { width: calc(100% - 1rem); }` | Subtractive width math plus fixed child groups increases overflow risk in narrow layouts. | Use `width: 100%; min-width: 0;` and spacing via container padding, not width subtraction. |
| 21 | `frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/transport-controls/transport-controls.component.css` - `.playback { flex-shrink: 0; }` and `frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/volume-control/volume-control.component.css` - `.volume { flex-shrink: 0; }` | Hard no-shrink groups fight for width against progress/time area and produce wrapping/overflow issues. | Allow shrink/wrap in mobile base (`flex: 1 1 auto; min-width: 0;`) and lock desktop arrangement at `>=1024px`. |
| 22 | `frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/volume-control/volume-control.component.css` - `.volbar { width: 140px; }` | Fixed pixel width does not adapt across small phones, landscape, and tablets. | Replace with fluid clamp: `inline-size: clamp(6rem, 28vw, 10rem)` (mobile), larger clamp at tablet/desktop breakpoints. |
| 23 | `frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/time-display/time-display.component.css` - `:host { margin-left: auto; }` and `.time { min-width: 90px; }` | Desktop alignment rules leak into small layouts and squeeze progress bar width. | Base: stack time below progress and center it. Desktop (`>=1024px`): reapply right-aligned inline readout. |
| 24 | `frontend/src/app/features/music-player/components/right-panel/right-panel.component.css` - `iframe[src*="youtube"]` global override | Unscoped global iframe rule leaks to any YouTube iframe in app and complicates future mobile webview embedding. | Scope to panel: `.now-playing iframe[src*="youtube"]` only. |
| 25 | Multiple files (`styles.css`, `song-list.component.css`) - hidden scrollbars | Hidden scrollbar pattern reduces discoverability and accessibility, especially for long lists on mobile. | Keep functional thin scrollbars on desktop and visible touch scroll affordance on mobile. |

## 2) Mobile-first Breakpoint Scaffold

```css
/* ---------- TOKENS + BASE (mobile default: <768px) ---------- */
:root {
  --bp-md: 48rem;   /* 768px */
  --bp-lg: 64rem;   /* 1024px */

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;

  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  --app-chrome-height: 11rem; /* desktop-only offset token */
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  min-height: 100%;
  overflow-x: hidden;
}

body {
  overflow-y: auto;
  line-height: 1.4;
  font-family: Roboto, "Helvetica Neue", sans-serif;
}

.app-layout {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.footer-container {
  position: sticky;
  bottom: 0;
  z-index: 30;
  padding: var(--space-2);
  padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
}

:host.platform-shell,
.platform-shell {
  min-height: 0;
}

.platform-shell .content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-3);
  height: auto;
  min-height: 0;
  overflow: visible;
}

app-playlist-panel,
app-right-panel {
  width: 100%;
  min-width: 0;
}

.song-list,
app-song-list,
.items {
  min-height: 0;
}

.items {
  overflow-y: auto;
  overflow-x: clip;
}

.item {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  gap: var(--space-2);
  align-items: center;
}

.item .info span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.controls {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

/* Hover effects only where a real hover pointer exists */
@media (hover: hover) and (pointer: fine) {
  .btn-control:hover,
  .shuffle-btn:hover,
  .item.clickable:hover {
    transform: translateY(-0.125rem);
  }
}

/* ---------- TABLET (>=768px) ---------- */
@media (min-width: 48rem) {
  .platform-shell .content {
    gap: var(--space-4);
    padding: var(--space-4);
  }

  .controls {
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
  }

  .volume .volbar {
    inline-size: clamp(8rem, 24vw, 12rem);
  }
}

/* ---------- DESKTOP RESTORE (>=1024px) ---------- */
@media (min-width: 64rem) {
  html, body { overflow: hidden; }

  .footer-container {
    position: static;
    padding: var(--space-2);
  }

  .platform-shell .content {
    grid-template-columns: minmax(20rem, 1fr) minmax(0, 1fr);
    height: calc(100dvh - var(--app-chrome-height));
    overflow: hidden;
  }

  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-5);
  }
}
```

## 3) Consistency Patch Plan

### Step 1: normalize box-sizing/reset + typography baseline
- Update `frontend/src/styles.css` to add universal box-sizing reset and body line-height baseline.
- Convert viewport primitives to mobile-first (`body` scrollable by default).
- Add standardized breakpoint tokens (`--bp-md`, `--bp-lg`) and use those constants across components.
- Remove duplicate `:root` tokens from `frontend/src/app/features/music-player/components/playlist-panel/styles/design-system.css`.

### Step 2: unify spacing scale + replace rogue margins/paddings
- Introduce one spacing scale (`--space-1..--space-6`) in `frontend/src/styles.css`.
- Replace hardcoded spacing in:
  - `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css`
  - `frontend/src/app/features/music-player/components/playlist-panel/styles/playlist-panel.css`
  - `frontend/src/app/features/music-player/components/footer/player-controls/player-controls.component.css`
- Delete magic-height values (`calc(100vh - 200px)`, fixed min-heights by list size) and switch to content-driven flex/grid + `min-height: 0`.

### Step 3: unify buttons + tiles
- Create one shared primitive stylesheet (for example `frontend/src/app/shared/ui/ui-primitives.css`) containing:
  - `.ui-tile` (panel shell look)
  - `.ui-btn-control` (transport/volume buttons)
  - `.ui-btn-gradient` (shuffle/dropdown/button shell)
- Replace duplicated button declarations in:
  - `transport-controls.component.css`
  - `volume-control.component.css`
  - `playlist-panel-header.component.css`
- Keep desktop visual identity by applying the same gradients/shadows through modifier classes at `>=1024px`.

### Step 4: fix list rows (thumb/text/controls)
- Update `song-item.component.html` to wrap local controls in a new `.item-actions` container.
- Change `song-item.component.css` row layout from flex-space-between to grid columns.
- Consolidate list scrolling rules into `song-list.component.css` only.
- Remove mobile `!important` patches and gate hover effects with pointer-capability media queries.

### Step 5: stabilize bottom player for mobile (sticky/collapsible)
- In `frontend/src/app/app.component.css`, make `.footer-container` sticky at mobile/tablet and static on desktop.
- Add safe-area bottom padding using `env(safe-area-inset-bottom)`.
- Add a compact/collapsible mode class on player controls (`.controls--collapsed`) for narrow heights.
- Keep existing desktop layout by restoring horizontal control layout at `>=1024px`.

## 4) Guardrails for future mobile app portability

1. Avoid magic viewport math (`calc(100vh - 200px)`).
Use tokenized chrome offsets with `100dvh` and content-driven layouts.

2. Avoid layout-critical `:has()` selectors.
Use explicit state classes from component logic (`.is-empty`, `.is-large`) and standard media queries.

3. Avoid `display: contents` on interactive wrappers.
Use regular block/flex wrappers for predictable semantics and focus behavior.

4. Avoid hover-only interaction assumptions.
Gate hover transitions behind pointer-capability media queries and provide tap-visible states.

5. Avoid global element overrides (`iframe[src*="youtube"]`).
Scope to component containers to prevent cross-screen side effects.

6. Avoid hidden scrollbars as a default pattern.
Keep visible or minimally styled scroll affordance, especially in long playlists.

7. Avoid pseudo-content icons/emojis for state-critical UI.
Use SVG/icon assets tied to semantic elements for consistent cross-platform rendering.

8. Avoid absolute/fixed hacks without safe-area support.
If sticky/fixed is required, include `env(safe-area-inset-*)` padding and test in iOS/Android webviews.

## 5) Diff-style snippets for key fixes

### Fix A: shell height and overflow (mobile-first)

```diff
--- a/frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css
+++ b/frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.css
@@
-.content {
-  height: calc(100vh - 200px);
-  overflow: hidden;
-}
+:host,
+.platform-shell {
+  min-height: 0;
+}
+
+.content {
+  height: auto;
+  min-height: 0;
+  overflow: visible;
+}
+
+@media (min-width: 64rem) {
+  .content {
+    height: calc(100dvh - var(--app-chrome-height));
+    overflow: hidden;
+  }
+}
```

### Fix B: list row structure (thumb/text/actions)

```diff
--- a/frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-item/song-item.component.html
+++ b/frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-item/song-item.component.html
@@
-  @if (platform === 'local') {
-    @if (localPlaylists.length > 0) {
-      <select class="quick-add-select" ...></select>
-    }
-    <button type="button" class="remove-btn" ...>x</button>
-  }
+  @if (platform === 'local') {
+    <div class="item-actions">
+      @if (localPlaylists.length > 0) {
+        <select class="quick-add-select" ...></select>
+      }
+      <button type="button" class="remove-btn" ...>x</button>
+    </div>
+  }
```

```diff
--- a/frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-item/song-item.component.css
+++ b/frontend/src/app/features/music-player/components/playlist-panel/playlist-panel-logic/song-item/song-item.component.css
@@
-.item {
-  display: flex;
-  justify-content: space-between;
-}
+.item {
+  display: grid;
+  grid-template-columns: 2.5rem minmax(0, 1fr) auto;
+  gap: 0.5rem;
+  align-items: center;
+}
+
+.item-actions {
+  display: inline-flex;
+  align-items: center;
+  gap: 0.375rem;
+}
```

### Fix C: shared control button primitive and hover gating

```diff
--- a/frontend/src/app/features/music-player/components/footer/player-controls/player-controls.component.css
+++ b/frontend/src/app/features/music-player/components/footer/player-controls/player-controls.component.css
@@
+.controls :is(app-transport-controls, app-volume-control) .btn-control {
+  background: linear-gradient(135deg, #4f6bff 0%, #5b7aff 50%);
+  border: .0625rem solid #000;
+  border-radius: .5rem;
+  padding: .5rem;
+  color: #fff;
+  transition: transform .18s ease, box-shadow .24s ease, filter .3s ease;
+  box-shadow: rgba(79,107,255,.4) 0 .375rem 1.125rem -.25rem, rgba(0,0,0,.55) 0 .25rem .75rem;
+}
+
+@media (hover: hover) and (pointer: fine) {
+  .controls :is(app-transport-controls, app-volume-control) .btn-control:hover {
+    transform: translateY(-0.1875rem);
+  }
+}
```

```diff
--- a/frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/transport-controls/transport-controls.component.css
+++ b/frontend/src/app/features/music-player/components/footer/player-controls/player-controls-components/transport-controls/transport-controls.component.css
@@
-/* duplicated .btn-control styles */
+/* shared .btn-control styles now live in player-controls.component.css */
```

