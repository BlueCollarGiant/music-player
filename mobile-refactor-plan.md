# Mobile-First Refactor Plan
**OmniPlay — CSS Cleanup & Layout Normalization**
**Date:** 2026-02-18 | **Constraint:** Preserve desktop; protect YouTube iframe

---

## Current Architecture Summary

```
app-root                          (styles.css: height:100%; overflow:hidden)
  └── .app-layout                 (app.component.css: flex col, min-height:100vh)
        ├── app-nav-bar           (hamburger menu, always visible)
        ├── .main-content         (flex:1, flex col — router-outlet lives here)
        │     └── <router-outlet>
        │           └── platform-shell / local-library-dashboard / landing
        │                 └── .content                   (platform-shell.component.css)
        │                       ├── app-playlist-panel   (left, flex:1)
        │                       │     └── .song-list     (gradient panel)
        │                       │           ├── playlist-panel-header (shuffle/select)
        │                       │           └── app-song-list → app-song-item (rows)
        │                       └── app-right-panel      (right, flex:1)
        │                             └── .now-playing   (gradient panel)
        │                                   ├── .media-container  (16:9 iframe wrapper)
        │                                   │     └── .video-container
        │                                   │           └── .youtube-player
        │                                   │                 └── <iframe> ← FRAGILE
        │                                   ├── .song-info-container
        │                                   └── .bottom-visualizer
        └── .footer-container     (conditionally shown, player controls)
              └── app-player-controls
                    ├── app-transport-controls  (.playback, .btn-control)
                    ├── app-volume-control      (.volume, .btn-control — DUPLICATE)
                    └── app-progress-bar        (:host flex, .progress .bar)
```

**Layout model (desktop):** `app-root` locks `height:100%; overflow:hidden` → the entire app is a fixed-height viewport, internal panels scroll. `.content` uses `height: calc(100vh - 200px)` to carve out space for nav + footer.

**Layout model (mobile, current):** `body` gets `overflow-y: auto` at 820px, `.content` gets `height: auto; min-height: calc(100vh - 180px)` at 768px. This creates a scrollable page. These two breakpoints (820px and 768px) are misaligned, creating a 52px dead band.

**YouTube iframe chain:** `app-right-panel` → `.now-playing` → `.media-container` → `.video-container` → `.youtube-player` → `<iframe>`. The `.now-playing` panel already has `overflow: hidden` which is safe because the iframe fills `.youtube-player` via `width/height: 100%`. The dangerous ancestors are `.content` (has `backdrop-filter: blur(10px)`) and `app-right-panel` (has `transition: transform`). Both can create stacking contexts.

---

## A. Top 10 Mobile Layout Issues (with exact file + selector references)

### #1 — Hardcoded `height: calc(100vh - 200px)` on `.content`
**File:** `platform-shell.component.css:17`
**Selector:** `.content { height: calc(100vh - 200px) }`
This hardcodes the assumption that nav + footer = 200px. On mobile Safari, `100vh` includes the browser chrome, so this clips content behind the address bar. The mobile override at 768px switches to `min-height: calc(100vh - 180px)` which still uses `100vh` math. Both need to go away.

### #2 — Body scroll breakpoint at 820px; layout breakpoint at 768px
**File:** `styles.css:10` → `@media (max-width: 820px)`
**File:** `platform-shell.component.css:102` → `@media (max-width: 768px)`
52px gap where body is still `overflow:hidden` but `.content` still has desktop `height: calc(100vh-200px)`. On tablets in this range (e.g. portrait iPad Mini at 768px), the layout is broken — the content panel can be taller than the locked viewport.

### #3 — `app-playlist-panel:hover` transform fires on tap (touch liftoff)
**File:** `platform-shell.component.css:58–61`
```css
app-playlist-panel:hover { transform: translateY(-2px); box-shadow: 0 20px 40px ... }
```
This `transform` also creates a new stacking context. The mobile override `app-playlist-panel:hover { transform: none }` at 768px only suppresses this at ≤768px. Between 768–820px (portrait tablet range), tap events trigger the lift, causing a visible jank. The hover override uses no `!important` here but the `transform` stacking context risk is real — any descendant `position: fixed` or iframe inside this panel will be positioned relative to this transformed ancestor. **Iframe is in `app-right-panel`, not `app-playlist-panel`, so this specific risk is lower** — but the touch-tap jank is still bad UX.

### #4 — `app-right-panel:hover` transform — direct ancestor of iframe
**File:** `platform-shell.component.css:78–81`
```css
app-right-panel:hover { transform: translateY(-2px); box-shadow: 0 20px 40px ... }
```
**This is the critical iframe risk.** `app-right-panel` is a direct ancestor of the YouTube iframe. Applying `transform` to it creates a new stacking context and new containing block for any `position: fixed` children. If the YouTube iframe's internal overlays (e.g. quality menu, CC picker) use `position: fixed`, they will now be positioned relative to the panel, not the viewport. This can cause popups to appear in the wrong location and cut off by `overflow: hidden` on `.content`. The mobile override correctly sets `transform: none` at ≤768px, but the same 768–820px gap applies.

### #5 — `overflow: hidden` on `.content` clips iframe overlays
**File:** `platform-shell.component.css:19`
```css
.content { overflow: hidden; }
```
YouTube's internal controls (e.g. "More videos" end-screen overlay, quality picker) can render outside the iframe boundaries using `position: fixed` relative to viewport. If a `transform` ancestor (see #4) converts `position: fixed` to `position: absolute`-equivalent, these controls will be clipped by this `overflow: hidden`. Currently at desktop sizes this is less likely to trigger because the transform only fires on hover and quickly reverts. On touch devices with slow hover, this could linger.

### #6 — `.shuffle-btn` has `min-width: 12.5rem; flex: 0 0 12.5rem` — hard 200px column
**File:** `playlist-panel-header.component.css:43–44`
```css
.shuffle-btn { min-width: 12.5rem; flex: 0 0 12.5rem; }
```
On viewport widths 300–500px, this single button can eat 200px of a ~330px content area, leaving only 130px for the playlist selector dropdown. The 700px override collapses the selector to a column, which is correct — but at, say, 550px the horizontal layout is still active and badly cramped.

### #7 — `app-right-panel` gets `min-height: 40vh` on mobile with `height: 100%`
**File:** `platform-shell.component.css:141–150`
```css
app-right-panel {
  min-height: 40vh;
  height: 100%;    /* ← 100% of what? Parent is height:auto at this breakpoint */
}
```
When `.content` is `height: auto`, `height: 100%` on a child means "100% of the auto height" which resolves to `height: auto` effectively (the child contributes to its own parent's intrinsic height, which is circular). The `min-height: 40vh` saves it, but `40vh` on iOS Safari with the chrome visible is also unreliable. The iframe inside this panel is then sized with `aspect-ratio: 16/9` on `.media-container` which is the correct approach — but only if the container has stable width, which depends on this height resolution chain working.

### #8 — Song-list mobile `max-height: 60vh` fights the flex-fill chain
**File:** `song-list.component.css:41`
```css
@media (max-width: 48rem) {
  .items { max-height: 60vh; }
}
```
This creates a capped scroll container at 60% of viewport height. However, on small phones (375px height) that's only 225px — about 3–4 song rows. The panel needs internal scroll, which is correct — but `60vh` is not a good unit here because iOS Safari `vh` does not account for the address bar. On load, 60vh may be ~360px; after the address bar retracts, it becomes 225px — causing a layout shift mid-scroll.

### #9 — Player controls stack vertically on mobile but `.controls { flex-direction: column }` gives no width constraint
**File:** `player-controls.component.css:19–25`
At 768px, `.controls` switches to `flex-direction: column` with `align-items: center`. The transport controls (`.playback`) use `flex-shrink: 0` and `gap: 1.5rem` — correct. But the progress bar host uses `flex: 1 1 auto; width: 100%` with `flex-direction: column` at 768px, which makes it stretch full-width. The time display (a `ng-content` slot) needs explicit width handling. On very narrow screens (320px) this works, but the transition is abrupt — there is no intermediate layout between "all horizontal" and "fully stacked column."

### #10 — `!important` overrides are a symptom of desktop-first writing in three separate files
**Files:**
- `transport-controls.component.css:123–127` — `.btn-control:hover { transform: none !important; box-shadow: none !important; background: ... !important }`
- `volume-control.component.css:79–83` — same pattern
- `song-item.component.css:132–148` — `.item:hover { transform:none !important; box-shadow:none !important; background-color:initial !important }` + `.item.active` overrides

These are all fighting their own desktop rules. The correct fix is `@media (hover: hover) and (pointer: fine)` on the desktop hover rules.

---

## B. Proposed CSS Scaffold

The following is the mental model for every component going forward. Actual CSS is written in mobile-first order; desktop overrides are additive.

```
┌─────────────────────────────────────────────────────┐
│  Base (no media query) = mobile ≤767px              │
│  • Flex column layout                               │
│  • No hover transforms                              │
│  • touch-action on drag targets                     │
│  • min-height: 0 on flex parents                    │
│  • No 100vh calc() math                             │
├─────────────────────────────────────────────────────┤
│  @media (min-width: 48rem) = tablet 768px–1023px   │
│  • Side-by-side panels where space allows           │
│  • Wider controls layout                            │
├─────────────────────────────────────────────────────┤
│  @media (min-width: 64rem) = desktop 1024px+        │
│  • Full desktop layout                              │
│  • Fixed viewport (overflow: hidden on body)        │
│  • Hover effects (or use @media (hover:hover))      │
├─────────────────────────────────────────────────────┤
│  @media (hover: hover) and (pointer: fine)          │
│  • ALL :hover rules go here (no breakpoint needed)  │
│  • Replaces all !important mobile hover overrides   │
├─────────────────────────────────────────────────────┤
│  @media (prefers-reduced-motion: reduce)            │
│  • animation: none; transition: none on all         │
└─────────────────────────────────────────────────────┘
```

### B.1 — Global (`styles.css`) scaffold

```css
/* === Base (mobile) === */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;                   /* mobile: page scrolls */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
body::-webkit-scrollbar { display: none; }

body {
  font-family: Roboto, "Helvetica Neue", sans-serif;
  background-color: #0f1631;
}
html { background-color: #0f1631; }

app-root { display: block; min-height: 100%; }  /* no height:100% trap */

/* === Tablet+ (768px) === */
/* No body-level changes needed */

/* === Desktop (1024px) — lock viewport === */
@media (min-width: 64rem) {
  html, body {
    height: 100%;
    overflow: hidden;                 /* restore desktop scroll lock */
  }
  app-root { height: 100%; min-height: 0; }
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### B.2 — App layout (`app.component.css`) scaffold

```css
/* === Base (mobile) === */
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;          /* grows with content on mobile */
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.footer-container {
  padding: 0.5rem;
  background: linear-gradient(135deg, rgba(0,0,0,0.4), rgba(20,20,20,0.6));
  border-radius: 1rem;
}

/* === Desktop (1024px) — fixed layout === */
@media (min-width: 64rem) {
  .app-layout {
    height: 100vh;            /* fixed viewport */
    min-height: unset;
    overflow: hidden;
  }
}
```

### B.3 — Platform shell (`platform-shell.component.css`) scaffold

```css
/* === Base (mobile) — single column, page scrolls === */
.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem;
  /* NO height calc(). Parent flex + page scroll handles sizing. */
  background: linear-gradient(135deg, rgba(0,0,0,0.4), rgba(20,20,20,0.6));
  border-radius: 1rem;
  backdrop-filter: blur(10px);  /* SAFE: no transform, just visual */
  border: 1px solid rgba(255,255,255,0.1);
  position: relative;
  overflow: visible;            /* mobile: let content overflow to page scroll */
}

app-playlist-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  background: rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  /* NO transition: transform — see hover section below */
}

app-right-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  background: rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  /* NO transition: transform on iframe ancestor */
  box-sizing: border-box;
}

/* Mobile playlist sizing — use intrinsic height, not vh */
app-playlist-panel:has(.song-list.empty)  { min-height: 17.5rem; }
app-playlist-panel:has(.song-list.small)  { min-height: 20rem; }
app-playlist-panel:has(.song-list.medium) { min-height: 25rem; }
app-playlist-panel:has(.song-list.large)  { min-height: 28rem; }

/* Right panel on mobile: let aspect-ratio on media-container size it */
app-right-panel { min-height: 0; }

/* === Tablet (768px) — still column layout, more breathing room === */
@media (min-width: 48rem) {
  .content {
    gap: 1.25rem;
    padding: 1rem;
  }
}

/* === Desktop (1024px) — side-by-side, fixed height, inner scroll === */
@media (min-width: 64rem) {
  .content {
    flex-direction: row;
    flex: 1;
    min-height: 0;
    gap: 1.5rem;
    padding: 1rem;
    height: 100%;          /* fill the fixed .app-layout/main-content chain */
    overflow: hidden;      /* desktop: clip to fixed panel, internal scroll */
  }

  app-playlist-panel {
    flex: 1;
    min-width: 300px;
    max-width: none;
  }

  app-playlist-panel:has(.song-list.empty)  { flex: 0.8; max-width: 400px; }
  app-playlist-panel:has(.song-list.small)  { flex: 0.9; max-width: 450px; }
  app-playlist-panel:has(.song-list.medium) { flex: 1; }
  app-playlist-panel:has(.song-list.large)  { flex: 1.2; min-width: 350px; }

  app-right-panel {
    flex: 1;
    height: 100%;
    max-height: 100%;
  }
}

/* === Hover — pointer devices only, no breakpoint needed === */
@media (hover: hover) and (pointer: fine) {
  app-playlist-panel {
    transition: box-shadow 0.3s ease;   /* box-shadow only, NO transform */
  }
  app-playlist-panel:hover {
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    /* REMOVED: transform: translateY(-2px) — too risky near iframe ancestor chain */
  }

  /* app-right-panel hover: NO transform ever — direct iframe ancestor */
  app-right-panel {
    transition: box-shadow 0.3s ease;
  }
  app-right-panel:hover {
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    /* REMOVED: transform: translateY(-2px) — IFRAME SAFETY */
  }
}

/* Glassmorphism overlay (safe — pointer-events:none, z-index:-1) */
.content::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(100,0,180,0.25) 45%, rgba(0,174,255,0.15) 55%);
  border-radius: 1rem;
  pointer-events: none;
  z-index: -1;
}
```

### B.4 — Player controls scaffold

```css
/* === Base (mobile) — stacked column === */
.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  width: 100%;
  box-sizing: border-box;
  background-image: linear-gradient(#6c6cff, #04f8f8);
  opacity: 0.75;
  border-radius: 0.5rem;
}

/* Transport (.playback) */
.playback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

/* Buttons — base (44px touch target, no hover) */
.btn-control {
  position: relative;
  min-width: 2.75rem;
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4f6bff, #5b7aff);
  border: 1px solid #000;
  border-radius: 0.5rem;
  padding: 0.5rem;
  color: white;
  cursor: pointer;
  box-shadow: rgba(79,107,255,.4) 0 6px 18px -4px, rgba(0,0,0,.55) 0 4px 12px;
}

/* Volume */
.volume {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
}
.volume .volbar { width: min(320px, 70vw); }

/* === Desktop (1024px) — horizontal row === */
@media (min-width: 64rem) {
  .controls {
    flex-direction: row;
    gap: 1.5rem;
    width: calc(100% - 1rem);
    margin: 0 auto;
    padding: 1rem;
  }
  .playback { flex-shrink: 0; flex-wrap: nowrap; }
  .volume { width: auto; flex-shrink: 0; }
  .volume .volbar { width: 140px; }
}

/* === Hover — pointer devices only === */
@media (hover: hover) and (pointer: fine) {
  .btn-control {
    transition: transform 0.18s ease, box-shadow 0.24s ease;
  }
  .btn-control:hover {
    transform: translateY(-3px);
    box-shadow: rgba(102,126,234,.5) 0 8px 24px -4px, rgba(0,0,0,.65) 0 6px 16px;
  }
  .btn-control:active {
    transform: translateY(-1px) scale(0.985);
  }
  .volume .volbar:hover { height: 0.5rem; }
  .shuffle-btn:hover { transform: translateY(-3px); }
  .shuffle-btn:hover .text { background: rgba(5,6,60,.4); letter-spacing: 0.09375rem; }
}
```

---

## C. Minimal Diff Plan (lowest-risk first)

Work in this exact order. Each step is independently safe to ship.

### Step 1 — Global: Fix body scroll breakpoint + add reduced-motion guard
**File:** `styles.css`
**Risk:** Near-zero. Changes scroll behavior on body, not layout of any component.

- Remove `@media (max-width: 820px)` block
- Replace with mobile-first approach: body gets `overflow-y: auto` as base, `overflow: hidden` only at `min-width: 64rem`
- Add `prefers-reduced-motion` guard at bottom

### Step 2 — Global: Delete `design-system.css`, remove `!important` from scrollbar
**File:** `frontend/src/app/features/music-player/components/playlist-panel/styles/design-system.css`
**Risk:** Near-zero. File is an exact duplicate of `:root` in `styles.css`. Remove from `playlist-panel.component.ts` styleUrls.

### Step 3 — Global: Move `@keyframes rainbow-bg` and `@keyframes floatNote` to `styles.css`
**Files:** `song-item.component.css` (remove both), `transport-controls.component.css` (remove `floatNote`), `progress-bar.component.css` (uses `rainbow-bg` — leave reference, remove definition), `styles.css` (add both definitions)
**Risk:** Low. Keyframes are already global. This is cleanup only.

### Step 4 — Consolidate `.btn-control` into `global-utils.css`
**Files:** `transport-controls.component.css`, `volume-control.component.css` → remove `.btn-control` definition from both. Add to `global-utils.css` (which lives in the playlist-panel styles directory and is already `styleUrls`-included, but `.btn-control` is used in transport/volume, which are different components).
**CAVEAT:** Because Angular component CSS is scoped, `.btn-control` in `global-utils.css` won't reach `transport-controls` or `volume-control` unless they also import `global-utils.css` in their `styleUrls`, OR unless `ViewEncapsulation.None` is used. Check if these components use `ViewEncapsulation.None`.

**Safe alternative if they use default encapsulation:** Move `.btn-control` to `styles.css` (truly global). Since `.btn-control` styles are self-contained (no component-specific overrides in the rule itself), this is safe.

### Step 5 — Remove `!important` hover overrides, add `@media (hover: hover)` wrapper
**Files:** `transport-controls.component.css`, `volume-control.component.css`, `song-item.component.css`
**Risk:** Low-medium. Changes hover behavior for pointer devices. Desktop look unchanged. Touch devices stop fighting the desktop rule.

For each file:
1. Find the `@media (max-width: 768px)` block with `!important` hover overrides
2. Delete the hover rule from inside it (keep any non-hover mobile rules)
3. Wrap the desktop `:hover` rules in `@media (hover: hover) and (pointer: fine)`

### Step 6 — Fix `.shuffle-btn` min-width
**File:** `playlist-panel-header.component.css`
**Risk:** Low. Only affects playlist panel header layout.

Change: `min-width: 12.5rem; flex: 0 0 12.5rem` → `min-width: 8rem; flex: 0 0 auto`
The button should shrink to its content width + padding when space is tight. The 700px breakpoint already handles the column stack; the base button just needs to be less aggressively wide.

### Step 7 — Fix `platform-shell.component.css` — the core layout bug
**File:** `platform-shell.component.css`
**Risk:** Medium. This is the biggest change. Do this after Steps 1–6 are confirmed working.

Key changes:
- Remove `height: calc(100vh - 200px)` from `.content`
- Remove `min-height: calc(100vh - 180px)` from mobile `.content`
- Add desktop `@media (min-width: 64rem)` to restore side-by-side layout with `height: 100%`
- Remove `transform` from hover rules on `app-right-panel` (iframe safety)
- Change `app-right-panel:hover` to `box-shadow` only
- Move `app-playlist-panel:hover` transform to `@media (hover: hover)` with only `box-shadow` (no `transform`)
- Remove `app-playlist-panel:hover, app-right-panel:hover { transform: none }` mobile override (it's now unnecessary)

### Step 8 — Fix song-list mobile `max-height: 60vh`
**File:** `song-list.component.css`
**Risk:** Low. Only affects list scroll container on mobile.

Remove `max-height: 60vh` from the mobile block. The panel's own `min-height` (set in platform-shell via `:has()`) bounds the list. The `.items` container has `overflow-y: auto` and `flex: 1 1 auto; min-height: 0` which already handles internal scroll correctly once the parent has a stable height.

### Step 9 — Fix `app.component.css` to participate in fixed layout
**File:** `app.component.css`
**Risk:** Low. Adds desktop-specific fixed height to app-layout.

### Step 10 — Fix playlist panel header breakpoint (700px → mobile base)
**File:** `playlist-panel-header.component.css`
**Risk:** Low.

The `@media (max-width: 43.75rem)` (700px) block that stacks the playlist-selector should become the **base (mobile) style** since we're going mobile-first. The side-by-side layout should be in `@media (min-width: 48rem)`.

---

## D. Patch Snippets — Exact Before/After

### Patch 1 — Platform shell: Remove calc-based height + fix iframe ancestor transform
**File:** `platform-shell.component.css`

**BEFORE:**
```css
/* Desktop base (current) */
.content {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(20,20,20,0.6) 100%);
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  height: calc(100vh - 200px);        /* ← THE BUG */
  position: relative;
  overflow: hidden;
}

app-right-panel:hover {
  transform: translateY(-2px);         /* ← IFRAME DANGER */
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

app-playlist-panel:hover {
  transform: translateY(-2px);         /* ← TOUCH JANK + stacking context */
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

@media (max-width: 768px) {
  .content {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 180px);   /* ← STILL USES 100VH MATH */
  }
  app-playlist-panel:hover,
  app-right-panel:hover {
    transform: none;                   /* ← !important not needed but fragile */
  }
}
```

**AFTER:**
```css
/* Base (mobile) */
.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(20,20,20,0.6) 100%);
  border-radius: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  position: relative;
  overflow: visible;          /* mobile: page scrolls, no clip needed */
}

app-playlist-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  background: rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  /* NO transform in base or hover */
}

app-right-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  background: rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  box-sizing: border-box;
  /* NO transform — ever — on iframe ancestor */
}

/* Mobile min-heights to give panels sensible size on page-scroll layout */
app-playlist-panel:has(.song-list.empty)  { min-height: 17.5rem; }
app-playlist-panel:has(.song-list.small)  { min-height: 20rem; }
app-playlist-panel:has(.song-list.medium) { min-height: 25rem; }
app-playlist-panel:has(.song-list.large)  { min-height: 28rem; }

/* Tablet (768px) */
@media (min-width: 48rem) {
  .content { gap: 1.25rem; padding: 1rem; }
}

/* Desktop (1024px) — restore side-by-side + fixed viewport */
@media (min-width: 64rem) {
  .content {
    flex-direction: row;
    flex: 1;
    min-height: 0;
    gap: 1.5rem;
    padding: 1rem;
    height: 100%;           /* fills .main-content which is flex:1 */
    overflow: hidden;       /* clip to panel, children scroll internally */
  }
  app-playlist-panel {
    flex: 1;
    min-width: 300px;
    max-width: none;
    height: 100%;
  }
  app-playlist-panel:has(.song-list.empty)  { flex: 0.8; max-width: 400px; min-height: unset; }
  app-playlist-panel:has(.song-list.small)  { flex: 0.9; max-width: 450px; min-height: unset; }
  app-playlist-panel:has(.song-list.medium) { flex: 1; min-height: unset; }
  app-playlist-panel:has(.song-list.large)  { flex: 1.2; min-width: 350px; min-height: unset; }
  app-right-panel {
    flex: 1;
    height: 100%;
    max-height: 100%;
    min-height: unset;
  }
}

/* Hover — pointer devices only, NO transform on either panel */
@media (hover: hover) and (pointer: fine) {
  app-playlist-panel { transition: box-shadow 0.3s ease; }
  app-playlist-panel:hover { box-shadow: 0 20px 40px rgba(0,0,0,0.3); }

  /* app-right-panel: intentionally NO :hover effect — iframe ancestor, too risky */
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
  .content {
    background: linear-gradient(135deg, rgba(0,0,0,0.6), rgba(30,30,30,0.8));
    border: 1px solid rgba(255,255,255,0.15);
  }
  app-playlist-panel, app-right-panel {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
  }
}

/* Glassmorphism overlay */
.content::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(100,0,180,0.25) 45%, rgba(0,174,255,0.15) 55%);
  border-radius: 1rem;
  pointer-events: none;
  z-index: -1;
}
```

---

### Patch 2 — Transport + Volume controls: Eliminate `!important`, add hover guard
**Files:** `transport-controls.component.css` AND `volume-control.component.css`

**BEFORE (transport-controls.component.css, bottom section):**
```css
/* ===== MOBILE RESPONSIVE ===== */
@media (max-width: 768px) {
  .playback {
    gap: 1.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .playback .thumbnail { width: 3rem; height: 3rem; }
  .btn-control { padding: 0.75rem; }
  .playback .play-pause { width: 3rem; height: 3rem; }

  /* Disable hover effects on mobile */
  .btn-control:hover {
    background: rgba(255, 255, 255, 0.1) !important;  /* ← !important */
    transform: none !important;                         /* ← !important */
    box-shadow: none !important;                        /* ← !important */
  }
}
```

**AFTER:**
```css
/* Base (mobile) — already works without hover rules */
.playback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.playback .thumbnail { width: 3rem; height: 3rem; }   /* mobile size as base */
.btn-control { padding: 0.625rem; }                   /* slightly more than before */
.playback .play-pause { width: 3rem; height: 3rem; }  /* mobile size as base */

/* Desktop (1024px) — restore desktop sizing */
@media (min-width: 64rem) {
  .playback { gap: 1.5rem; flex-wrap: nowrap; }
  .playback .thumbnail { width: 3.5rem; height: 3.5rem; }
  .btn-control { padding: 0.5rem; }
  .playback .play-pause { width: 2.5rem; height: 2.5rem; }
}

/* Hover — pointer devices only, NO !important needed */
@media (hover: hover) and (pointer: fine) {
  .btn-control { transition: transform 0.18s ease, box-shadow 0.24s ease; }
  .btn-control:hover {
    transform: translateY(-3px);
    box-shadow: rgba(102,126,234,.5) 0 8px 24px -4px, rgba(0,0,0,.65) 0 6px 16px;
  }
  .btn-control:active { transform: translateY(-1px) scale(0.985); }
}
```

Apply the same `@media (hover: hover)` pattern to `volume-control.component.css` — remove the `.btn-control:hover { ... !important }` inside the 768px block entirely, and add the hover guard pattern above.

---

### Patch 3 — Song item: Remove `!important` mobile hover overrides
**File:** `song-item.component.css`

**BEFORE:**
```css
.item.clickable:hover {
  border-color: rgba(255,255,255,.28);
  background: linear-gradient(90deg, rgba(255,255,255,.08) 0%, rgba(0,0,0,0) 120%);
  transform: translateY(-.0625rem);
}

.item.active {
  transform: translateY(-.0625rem);    /* always-on transform on active item */
}

@media (max-width: 48rem) {
  .item:hover {
    transform: none !important;
    box-shadow: none !important;
    background-color: initial !important;
  }
  .item.active {
    background: linear-gradient(...) !important;
    box-shadow: ... !important;
    color: #fff !important;
    margin: 0 !important;
  }
  .item.active:hover {
    background-color: rgba(255,255,255,.05) !important;
    box-shadow: ... !important;
    margin: 0 !important;
  }
}
```

**AFTER:**
```css
.item.clickable {
  cursor: pointer;
}

/* Active item — no transform, just border/shadow/bg */
.item.active {
  background: linear-gradient(90deg, rgba(255,255,255,.18) 0%, rgba(0,0,0,0) 120%);
  border: 0.125rem solid #fff;
  box-shadow: 0 0 0 0.0625rem #fff, 0 0 0.75rem rgba(96,165,250,.5);
  /* REMOVED: transform: translateY(-.0625rem) — unnecessary and fights mobile */
  color: #fff;
}

/* Hover — pointer devices only */
@media (hover: hover) and (pointer: fine) {
  .item.clickable:hover {
    border-color: rgba(255,255,255,.28);
    background: linear-gradient(90deg, rgba(255,255,255,.08) 0%, rgba(0,0,0,0) 120%);
    transform: translateY(-1px);
  }
  /* Active item hover state — keep glow, allow slight lightening */
  .item.active:hover {
    background: linear-gradient(90deg, rgba(255,255,255,.22) 0%, rgba(0,0,0,0) 120%);
  }
}

/* The entire @media (max-width: 48rem) !important block is now DELETED */
/* Mobile adjustments that remain (non-hover): */
@media (max-width: 48rem) {
  .item { width: 100%; }    /* only if needed; it's already width:100% in base */
}
```

---

## E. Verification Checklist

### Before Merging Each Step

**Step 1–3 (global/tokens):**
- [ ] App loads without visual regression on desktop Chrome at 1280px
- [ ] App loads without visual regression on desktop at 1440px (large Mac)
- [ ] No console errors about missing keyframe names

**Step 4–5 (hover guard + btn-control consolidation):**
- [ ] On desktop (pointer: fine): `.btn-control` still lifts on hover
- [ ] On mobile Chrome DevTools (touch emulation): no hover lift on `.btn-control`
- [ ] On mobile Chrome DevTools: no flash/jank when tapping song items
- [ ] `.shuffle-btn:hover` still works on desktop

**Step 6 (shuffle-btn width):**
- [ ] At 375px viewport: playlist header dropdowns and shuffle button are not overlapping
- [ ] At 768px: header layout looks correct
- [ ] At 1024px: header layout is visually unchanged from current

**Step 7 (platform-shell — the critical one):**
- [ ] **Desktop (1024px+):** Side-by-side layout intact, panels fill viewport height, no overflow clipping
- [ ] **Desktop:** YouTube iframe plays correctly, internal controls (quality picker, CC) appear in correct position
- [ ] **Desktop:** No visual regression in playlist panel or right panel appearance
- [ ] **Tablet (768px–1023px):** Content is column-stacked, page scrolls vertically
- [ ] **Mobile (375px, 390px, 414px):** Page scrolls, both panels visible by scrolling, no content cut off
- [ ] **Mobile:** Tapping a song item does not cause layout shift
- [ ] **Mobile:** YouTube video plays when tapped; controls are accessible
- [ ] **Mobile:** No element overlays the iframe and blocks pointer events
- [ ] **Mobile Safari (iOS):** Page scroll works, no rubberbanding issues
- [ ] **Removed `transform` from `app-right-panel:hover`** — verified by inspecting computed styles in DevTools

**Step 8–10 (song-list, app-layout, header breakpoint):**
- [ ] Song list scrolls internally on desktop (overflow-y:auto in .items)
- [ ] Song list on mobile does not have hard `60vh` cap causing mid-scroll resize
- [ ] Playlist header stacks correctly on mobile without requiring 700px override

**Final regression test:**
- [ ] Landing page unchanged
- [ ] Local library dashboard unchanged (has its own layout using `:host { display:flex; flex:1 }`)
- [ ] Player controls: transport, volume, progress bar all usable by touch on mobile
- [ ] All touch targets: minimum 44px (2.75rem) — verify with DevTools accessibility overlay
- [ ] `prefers-reduced-motion: reduce` in DevTools → all animations/transitions disabled
- [ ] Light/dark theme: no visual regression (dark theme override in platform-shell still applies)

---

## Quick Reference: What NOT to Touch

| Element | Reason |
|---------|--------|
| `.youtube-player iframe` styles | Working fine; do not change `width/height: 100% !important` |
| `.media-container { aspect-ratio: 16/9 }` | Correct approach for iframe sizing — keep it |
| `.video-container { overflow: hidden }` | Clips the iframe safely to the aspect-ratio box — keep it |
| `backdrop-filter: blur()` on `.content` | Safe — not a `transform`, does not affect iframe stacking |
| `overflow: hidden` on `.now-playing` | Safe — clips the gradient panel, not the iframe container |
| `app-right-panel overflow: hidden` | Safe — clips the panel border, iframe fills the panel via flex |
| Large screen `@media (min-width: 90rem/120rem/160rem)` in right-panel | Keep — these are deliberate 4K/5K display accommodations |
| `@keyframes rainbow-bg` in progress-bar | Keep the reference, just move the definition to `styles.css` |
| `touch-action: none` on `.volbar` | Required for touch drag — do not remove |
