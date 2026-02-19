# OmniPlay — Mobile & Design System Audit
**Audited:** 2026-02-18
**Scope:** All CSS files under `frontend/src/`, plus structural review of Angular component layout chains
**Role:** Senior product designer + front-end architect

---

## A. Top 10 Issues Harming Mobile UX

### 1. Hardcoded `height: calc(100vh - 200px)` in platform-shell
**File:** `platform-shell.component.css:17`
**Impact:** Critical. On mobile the header/footer heights differ; this locks the content pane to a fixed calculation that assumes a ~200px combined chrome. On a 667px iPhone SE viewport, the content pane is 467px — the right panel footer and playlist panel overflow off-screen.
**Mobile breakpoint fix at 768px:** switches to `height: auto; min-height: calc(100vh - 180px)` — but that creates a scrollable page-length layout that fights `overflow:hidden` on `.content`.

### 2. Duplicate `:root` token block — `design-system.css` vs `styles.css`
**Files:** `styles.css:68–115` and `design-system.css:1–49` (byte-for-byte identical)
**Impact:** High. Double maintenance burden; easy to let them drift. Neither file is the "source of truth." Any token change must be made in two places. Currently `design-system.css` is loaded per-component via `playlist-panel.component.css → styleUrls`, meaning the `:root` block is re-injected into every playlist-panel shadow (even though Angular still processes it globally). Confusing and fragile.

### 3. Inconsistent breakpoints across files
| File | Breakpoint used |
|------|----------------|
| `styles.css` | 820px (body scroll) |
| `platform-shell.component.css` | 768px |
| `player-controls.component.css` | 768px |
| `transport-controls.component.css` | 768px |
| `volume-control.component.css` | 768px |
| `song-item.component.css` | 48rem (768px) |
| `song-list.component.css` | 48rem (768px) |
| `playlist-panel.css` | 48rem (768px) |
| `playlist-panel-header.component.css` | 43.75rem (700px) |
| `local-library-dashboard.component.css` | 48rem (768px) |

**Impact:** High. The body scroll override fires at 820px but most layout switches happen at 768px, leaving a 52px "neither mode works well" band. The header breakpoint at 700px misaligns with everything else.

### 4. `.btn-control` defined in two separate component files
**Files:** `transport-controls.component.css:32` and `volume-control.component.css` (same rule)
**Impact:** Medium. Both components define identical `.btn-control` styles with the same gradient, border, border-radius, padding, and box-shadow. These components also live inside the same parent (`player-controls`). When one changes, the other silently doesn't.

### 5. Touch targets below 44px minimum (WCAG 2.5.5)
Found across multiple components:
- `.add-songs-btn-inline`: `width: 1.5rem; height: 1.5rem` = **24px**
- `.remove-btn`: `padding: 0.25rem 0.5rem` on a single character = ~**32px** tall
- `.quick-add-select`: `max-width: 3rem; padding: 0.2rem 0.3rem` = ~**30px** tap area
- Floating note thumbnails `.thumbnail::before/::after` use emoji as pseudo-elements — untappable but contribute to visual noise on mobile

### 6. Hover-only interactivity disabled with `!important` overrides on mobile
Multiple files use patterns like:
```css
.btn-control:hover {
  background: rgba(255,255,255,0.1) !important;
  transform: none !important;
  box-shadow: none !important;
}
```
This is the right idea (hover doesn't apply on touch) but using `!important` to override the desktop rule is a sign of desktop-first architecture bolted with mobile patches. It creates specificity debt. The correct approach is mobile-first: write the base style for touch, add hover effects in a `@media (hover: hover)` query.

### 7. Fixed widths on interactive elements
- `nav-bar`: `.login-btn { width: 200px }` — not fluid, clips at ~360px viewport
- `nav-bar`: `.glass-platform-btn` has per-platform pixel-level padding tweaks; no `min-width` safety net
- `playlist-panel-header`: `.shuffle-btn { min-width: 12.5rem; flex: 0 0 12.5rem }` — hard 200px column that can't shrink below 700px breakpoint
- `volbar`: fixed `width: 140px` on desktop (uses `min(320px, 70vw)` on mobile — good — but desktop value stays fixed)

### 8. `app-playlist-panel:hover` lift effect fires on touch tap
**File:** `platform-shell.component.css:58–61`
```css
app-playlist-panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}
```
On mobile, tapping the panel causes a visible layout shift (2px lift + shadow). The 768px breakpoint correctly disables this, but between 768px and 820px (the body scroll breakpoint) a user on a narrow landscape tablet will see the tap-lift.

### 9. `overflow: hidden` on `.content` fights mobile page scroll
**File:** `platform-shell.component.css:19`
At 768px, `.content` switches from `height: calc(100vh - 200px)` to `height: auto` — which means the content pane grows to fit. But the outer `html, body { overflow: hidden }` (disabled at 820px) and the inner `overflow: hidden` on `.content` can trap scroll in ways that differ by browser. On iOS Safari in particular, momentum scrolling inside `overflow: hidden` containers is broken.

### 10. No `@media (prefers-reduced-motion)` guards on animations
Animations active with no motion-preference checks:
- `@keyframes rainbow-bg` — perpetual 18s gradient animation on `.thumbnail` (song-item) AND `.playback .thumbnail` (transport-controls) — two independent definitions of the same keyframe
- `@keyframes floatNote` — floating emoji animation, also duplicated in transport-controls AND song-item
- `@keyframes connected-glow`, `start-glow`, `glowing-login-btn` in nav-bar
- `@keyframes quick-add-pop` in styles.css (fine — it's one-shot, short)

No file wraps any animation in `@media (prefers-reduced-motion: reduce)`. This is a WCAG 2.3.3 violation and can cause nausea for users with vestibular disorders.

---

## B. Token Proposal

The current `:root` block is good but incomplete. Below is a cleaned, extended set that covers every hard-coded value found in the audit:

```css
/* styles.css — single source of truth, delete design-system.css entirely */
:root {
  /* ── Palette ── */
  --color-primary:          #3b82f6;
  --color-primary-dark:     #1a2142;
  --color-primary-hover:    #2563eb;
  --color-accent:           #60a5fa;
  --color-success:          #10b981;
  --color-danger:           #ff6b6b;
  --color-local:            #6b4cff;       /* purple brand for local platform */

  /* ── Text ── */
  --color-text:             #ffffff;
  --color-text-muted:       rgba(255, 255, 255, 0.7);
  --color-text-faint:       rgba(255, 255, 255, 0.35);

  /* ── Surfaces ── */
  --color-surface-1:        rgba(255, 255, 255, 0.05);
  --color-surface-2:        rgba(255, 255, 255, 0.08);
  --color-border:           rgba(255, 255, 255, 0.10);
  --color-border-hover:     rgba(255, 255, 255, 0.28);

  /* ── Items (song rows, list items) ── */
  --color-item-bg:          rgba(30,  80, 180, 0.12);
  --color-item-bg-hover:    rgba(30, 100, 210, 0.18);
  --color-item-bg-active:   rgba(30,  64, 175, 0.55);
  --color-item-border:      rgba(255, 255, 255, 0.18);
  --color-item-border-hover:rgba(255, 255, 255, 0.35);

  /* ── Panel gradient (shared by now-playing, song-list, dashboard, controls) ── */
  --gradient-panel:         linear-gradient(180deg, #6c6cff 0%, #04f8f8 95%);
  --gradient-panel-h:       linear-gradient(90deg, #6c6cff 0%, #04f8f8 95%);
  --gradient-btn:           linear-gradient(144deg, #AF40FF, #5B42F3 50%, #00DDEB);
  --gradient-control-btn:   linear-gradient(135deg, #4f6bff 0%, #5b7aff 50%);
  --gradient-bg:            linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(20,20,20,0.6) 100%);

  /* ── Spacing scale ── */
  --space-1:  0.25rem;   /*  4px */
  --space-2:  0.5rem;    /*  8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */

  /* ── Radius ── */
  --radius-sm: 0.375rem;   /*  6px */
  --radius-md: 0.5rem;     /*  8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */

  /* ── Touch targets ── */
  --touch-min: 2.75rem;    /* 44px — WCAG 2.5.5 minimum */

  /* ── Typography ── */
  --font-size-xs:   0.75rem;
  --font-size-sm:   0.875rem;
  --font-size-base: 1rem;
  --font-size-lg:   1.1rem;
  --text-shadow:    1px 1px 2px rgba(0, 0, 0, 0.6);

  /* ── Motion ── */
  --transition-fast:   0.15s ease;
  --transition-base:   0.2s ease;
  --transition-slow:   0.3s ease;

  /* ── Shadows ── */
  --shadow-sm:  0 2px 8px rgba(0, 0, 0, 0.15);
  --shadow-md:  0 4px 12px rgba(0, 0, 0, 0.2);
  --shadow-lg:  0 20px 40px rgba(0, 0, 0, 0.3);
  --shadow-btn: rgba(79,107,255, 0.4) 0 6px 18px -4px, rgba(0,0,0, 0.55) 0 4px 12px;
}
```

**Key additions over current:**
- `--color-local`, `--color-danger`, `--color-text-faint` — replace inline rgba values scattered through 6+ files
- `--gradient-panel`, `--gradient-btn`, `--gradient-control-btn` — same gradient is copy-pasted 8+ times across files
- `--space-*` scale renamed from `--spacing-*` for brevity; add `--space-1` through `--space-8`
- `--touch-min: 2.75rem` — explicit 44px constant for interactive element sizing
- `--radius-*` expanded (currently only `--border-radius` and `--border-radius-lg`)
- `--transition-fast/base/slow` — replaces ad-hoc `0.15s`, `0.18s`, `0.2s`, `0.24s`, `0.3s` sprinkled everywhere

---

## C. Breakpoint Scaffold

**Recommended: 2-tier mobile-first.**

The app currently uses desktop-first with mobile patches. The correct model:

```
Base:    ≤ 767px   → mobile (single column, full-width, touch-first)
md:      ≥ 768px   → tablet / narrow desktop (side-by-side possible)
lg:      ≥ 1024px  → wide desktop (full layout, optional hover enhancements)
hover:   hover: hover + pointer: fine → desktop hover effects
motion:  prefers-reduced-motion: no-preference → animations enabled
```

**In CSS:**
```css
/* --- Mobile-first base (no media query) --- */
/* Write all default styles for ≤767px here */

/* --- Tablet+ --- */
@media (min-width: 48rem) {        /* 768px */
  /* Side-by-side panels, wider controls */
}

/* --- Wide desktop --- */
@media (min-width: 64rem) {        /* 1024px */
  /* Optional: larger typography, wider right panel cap */
}

/* --- Hover-capable devices only --- */
@media (hover: hover) and (pointer: fine) {
  /* All :hover transform/box-shadow effects go here */
  /* This correctly excludes touchscreens regardless of viewport width */
}

/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Changes from current:**
| Current | New |
|---------|-----|
| 820px body scroll override | 768px (unify) |
| 768px in px | 48rem consistently |
| 700px (header only) | Remove; use 768px |
| Desktop-first hover everywhere | `@media (hover: hover) and (pointer: fine)` |
| No reduced-motion guard | Add global guard in `styles.css` |

---

## D. Component Conformity Checklist

| Component | Uses tokens | Touch ≥44px | Hover guarded | Breakpoints unified | No hardcoded gradients | Reduced motion | Status |
|-----------|-------------|-------------|---------------|--------------------|-----------------------|----------------|--------|
| `styles.css` (global) | N/A | N/A | — | — | N/A | ❌ Missing global guard | ⚠️ |
| `app.component.css` | ✅ | N/A | — | — | ❌ inline gradient | — | ⚠️ |
| `platform-shell.component.css` | ❌ inline values | N/A | ❌ (hover on touch) | ✅ 768px | ❌ inline gradients | ❌ | ❌ |
| `nav-bar.component.css` | ❌ mostly | N/A | ❌ | ❌ no breakpoint | ❌ many | ❌ | ❌ |
| `player-controls.component.css` | ❌ inline | N/A | — | ✅ 768px | ❌ inline gradient | ❌ | ⚠️ |
| `transport-controls.component.css` | ❌ inline | ✅ (0.75rem pad = ~44px mobile) | ❌ uses !important | ✅ 768px | ❌ duplicate gradient | ❌ | ⚠️ |
| `volume-control.component.css` | ❌ inline | ⚠️ (close) | ❌ uses !important | ✅ 768px | ❌ duplicate `.btn-control` | ❌ | ❌ |
| `right-panel.component.css` | ⚠️ partial | N/A | — | ✅ 48rem | ❌ inline gradient | ❌ | ⚠️ |
| `playlist-panel.css` | ⚠️ partial | N/A | — | ✅ 48rem | ❌ inline gradient | ❌ | ⚠️ |
| `playlist-panel-header.component.css` | ⚠️ partial | ⚠️ (shuffle-btn ok, dropdown tight) | — | ❌ 700px outlier | ❌ inline gradient | ❌ | ❌ |
| `song-list.component.css` | ✅ | N/A | — | ✅ 48rem | ✅ | — | ✅ |
| `song-item.component.css` | ✅ | ✅ (min-height 4rem = 64px) | ❌ uses !important | ✅ 48rem | ❌ inline gradients | ❌ (rainbow-bg) | ⚠️ |
| `local-library-dashboard.component.css` | ✅ | ❌ add-songs-btn 24px | — | ✅ 48rem | ❌ inline gradient | — | ⚠️ |
| `design-system.css` | — | — | — | — | — | — | ❌ DELETE |

---

## E. Prioritized Refactor Plan

### Phase 1 — Quick Wins (< 1 day, zero risk)

These are isolated changes with no architectural impact:

1. **Delete `design-system.css`** — it is byte-for-byte identical to the `:root` in `styles.css`. Remove it from `playlist-panel.component.ts` `styleUrls`. Zero functional change.

2. **Add `@media (prefers-reduced-motion: reduce)` global guard** — add 6 lines to `styles.css`. Covers all animations app-wide.

3. **Fix `add-songs-btn-inline` touch target** — change `width: 1.5rem; height: 1.5rem` to `min-width: 2.75rem; min-height: 2.75rem` (44px). Local library dashboard only.

4. **Remove duplicate `@keyframes rainbow-bg` and `floatNote`** — these are defined in both `transport-controls.component.css` and `song-item.component.css`. Move both to `styles.css` (global) and delete the local copies.

5. **Fix the 700px outlier breakpoint** in `playlist-panel-header.component.css` — change `43.75rem` to `48rem` to match the rest of the app.

6. **Extract `--gradient-panel` token** — the identical `linear-gradient(180deg, #6c6cff 0%, #04f8f8 95%)` string appears in `playlist-panel.css`, `right-panel.component.css`, `local-library-dashboard.component.css`, and `player-controls.component.css`. Add it as `--gradient-panel` in `:root`, then replace all 4 occurrences.

---

### Phase 2 — Structural Cleanup (1–2 days, low risk)

These address root causes of the mobile layout problems:

7. **Migrate to mobile-first layout in `platform-shell.component.css`** — write base styles without the `height: calc(100vh - 200px)` hack. Use flex-fill via `:host { display: flex; flex: 1; min-height: 0 }` on the shell, and let `.content` fill naturally. Keep the 768px query for side-by-side panel arrangement.

8. **Unify body scroll breakpoint** — change `styles.css` `@media (max-width: 820px)` to `@media (max-width: 767px)` (or keep at 768px). Remove the 52px gap.

9. **Replace `!important` hover overrides with `@media (hover: hover)`** — affects `transport-controls.component.css`, `volume-control.component.css`, `song-item.component.css`, `platform-shell.component.css`. Remove the `!important` override blocks; add the same rules inside a `@media (hover: hover) and (pointer: fine)` block in the desktop section.

10. **Extract `.btn-control` to shared CSS** — move the rule from `transport-controls.component.css` into `global-utils.css` (which already exists under `playlist-panel/styles/`). Remove the duplicate from `volume-control.component.css`. Both components already share the same parent layout context.

11. **Fix `.login-btn { width: 200px }` in nav-bar** — replace with `min-width: 9rem; width: auto; padding-inline: var(--space-6)` so it shrinks on mobile.

---

### Phase 3 — Polish (ongoing, additive)

These improve the product feel without fixing bugs:

12. **Add `--gradient-btn` token** and replace all instances of the `linear-gradient(144deg, #AF40FF, #5B42F3 50%, #00DDEB)` shuffle/dropdown gradient.

13. **Add `--touch-min: 2.75rem` and apply consistently** to all interactive icon buttons: `remove-btn`, `quick-add-select`, `add-songs-btn-inline`, nav-bar icon buttons.

14. **Per-platform accent tokens** — the commented-out block in `styles.css` is the right idea. Implement `--accent-color` and `--accent-gradient` per platform class (`platform--local`, `platform--youtube`, etc.) so controls automatically reflect the active platform.

15. **Replace `backdrop-filter: blur(10px)` with a token** — `--blur-glass: blur(10px)` and use it consistently (currently `blur(10px)`, `blur(20px)`, `blur(0.125rem)` all appear).

---

## F. Example Rewrites

### F1. `platform-shell.component.css` — Fix the hardcoded height

**Before:**
```css
.content {
  height: calc(100vh - 200px); /* Account for header and footer */
  overflow: hidden;
  /* ... */
}

@media (max-width: 768px) {
  .content {
    height: auto;
    min-height: calc(100vh - 180px);
  }
}
```

**After (mobile-first):**
```css
/* Base — mobile */
.content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;   /* stack on mobile */
  gap: var(--space-4);
  padding: var(--space-3);
  background: var(--gradient-bg);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* Tablet+ — side-by-side */
@media (min-width: 48rem) {
  .content {
    flex-direction: row;
    gap: var(--space-6);
    padding: var(--space-4);
  }
}

/* Desktop hover effect — touch safe */
@media (hover: hover) and (pointer: fine) {
  app-playlist-panel:hover,
  app-right-panel:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
}
```

The `app-layout → main-content → platform-shell` chain already uses `flex: 1` at each level. Removing the `calc(100vh - 200px)` hack and letting flex fill work naturally is safe once the parent chain is confirmed (`app.component.css` already sets this up correctly with `flex: 1` on `.main-content`).

---

### F2. `transport-controls.component.css` — Touch-safe `.btn-control`

**Before:**
```css
.btn-control:hover {
  transform: translateY(-0.1875rem);
  box-shadow: rgba(102,126,234,.5) 0 0.5rem 1.5rem -0.25rem, rgba(0,0,0,.65) 0 0.375rem 1rem;
}

@media (max-width: 768px) {
  .btn-control:hover {
    background: rgba(255,255,255,0.1) !important;  /* ← fighting desktop rule */
    transform: none !important;
    box-shadow: none !important;
  }
}
```

**After:**
```css
.btn-control {
  /* base style — no hover, works on touch */
  position: relative;
  background: var(--gradient-control-btn);
  border: 1px solid #000;
  border-radius: var(--radius-md);
  padding: var(--space-2);
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast), box-shadow var(--transition-base);
  box-shadow: var(--shadow-btn);
}

/* Desktop hover — only fires on pointer devices */
@media (hover: hover) and (pointer: fine) {
  .btn-control:hover {
    transform: translateY(-3px);
    box-shadow: rgba(102,126,234,.5) 0 8px 24px -4px, rgba(0,0,0,.65) 0 6px 16px;
  }
}
```

No `!important` needed. Touch devices never see the hover rule at all.

---

### F3. `local-library-dashboard.component.css` — Fix small add-button touch target

**Before:**
```css
.add-songs-btn-inline {
  width: 1.5rem;      /* 24px — too small */
  height: 1.5rem;
  border-radius: 50%;
  /* ... */
}
```

**After:**
```css
.add-songs-btn-inline {
  /* Meet 44px touch target minimum */
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  border-radius: 50%;
  /* Visually still looks small via inner content, tap area is correct */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(107, 76, 255, 0.4);
  background: rgba(107, 76, 255, 0.15);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.add-songs-btn-inline:not(:disabled):hover {
  background: rgba(107, 76, 255, 0.35);
}

.add-songs-btn-inline:disabled {
  opacity: 0.5;
  cursor: default;
}
```

---

## Summary Table

| Priority | Issue | Files | Effort |
|----------|-------|-------|--------|
| P0 | Delete `design-system.css` duplicate | 1 file | 5 min |
| P0 | Add reduced-motion guard | `styles.css` | 5 min |
| P1 | Fix hardcoded `calc(100vh - 200px)` | `platform-shell.component.css` | 30 min |
| P1 | Unify breakpoints to `48rem` everywhere | 10 files | 30 min |
| P1 | Fix 24px touch targets (add-songs, remove, quick-add) | 2 files | 20 min |
| P1 | Replace `!important` hover overrides with `@media (hover: hover)` | 4 files | 45 min |
| P2 | Extract panel gradient to `--gradient-panel` token | 4 files | 20 min |
| P2 | Deduplicate `rainbow-bg` / `floatNote` keyframes | 2 files | 15 min |
| P2 | Consolidate `.btn-control` into `global-utils.css` | 3 files | 20 min |
| P3 | Extract `--gradient-btn`, `--touch-min` tokens | many | 1 hr |
| P3 | Per-platform accent tokens | `styles.css` + nav-bar | 45 min |
