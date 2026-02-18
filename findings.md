# OmniPlay Structural Findings (Blueprint Comparison)

---

## 1) What We Imported

**Blueprint file used:**
- `OMNIPLAY_ARCHITECTURAL_TRANSFER_BLUEPRINT.md` (project root) — a distilled analysis of 12 documentation files from the Lilith project, spanning `/docs/frontend/`, `/docs/backend/`, and `/docs/shared/`.

**Summary:**
The blueprint documents the architectural patterns that made the Lilith AI-character platform maintainable at scale. Its core emphasis is: feature-first folder structure (domain owns everything it touches), signal-first reactive state with read-only public exposure, a strict three-layer backend (controller → service → data access), dependency direction rules that prevent cross-feature coupling, a standard API response envelope, and explicit scope management — non-goals are documented by name, not vaguely acknowledged. The blueprint is Angular + Node/Express native but deliberately separates portable concepts from framework-specific APIs.

---

## 2) Current OmniPlay Structure (As-Is)

### High-Level Map

```
music-player/
├── backend/
│   ├── config/          # db.js, cors.js, passport.js
│   ├── middleware/       # auth.js, admin.js
│   ├── models/          # User.js, PlatformConnection.js, PasswordReset.js
│   ├── routes/          # users.js, userProfiles.js, youtube.js, platforms.js,
│   │                    #   admin.js, passwordResets.js, auth.js (inferred)
│   ├── services/        # jwt.js, youtubeService.js, spotifyClient.js
│   ├── seeds.js
│   └── server.js
│
├── frontend/src/app/
│   ├── core/
│   │   ├── auth/        # auth.guard.ts, auth.interceptor.ts, auth.service.ts
│   │   ├── playback/    # player-port.ts, playback-state.store.ts,
│   │   │                #   playlist-instance.ts, adapter-registry.service.ts
│   │   └── platform-state/  # platform-state.service.ts (empty — 1 line)
│   ├── shared/
│   │   ├── models/      # song.model.ts
│   │   ├── ui/          # auth-modal/
│   │   ├── utils/       # time-format.util.ts, youtube.util.ts
│   │   └── shared.module.ts
│   ├── features/
│   │   ├── music-player/
│   │   │   ├── adapters/
│   │   │   │   ├── spotify/  # core/, integration/, playback/, state/, bridges/
│   │   │   │   └── youtube/  # core/, playback/, state/, bridges/
│   │   │   ├── components/
│   │   │   │   ├── footer/player-controls/  (sub-components)
│   │   │   │   ├── header/nav-bar/
│   │   │   │   ├── platform-shell/
│   │   │   │   ├── playlist-panel/playlist-panel-logic/
│   │   │   │   └── right-panel/visualizer-container/
│   │   │   ├── main/landing/landing-content/
│   │   │   └── services/    # youtube.service.ts, spotify.service.ts,
│   │   │                    #   play-list-logic.service.ts, omniplay.service.ts,
│   │   │                    #   playback-coordinator.service.ts (empty),
│   │   │                    #   music-player.service.ts (empty),
│   │   │                    #   preview-audio.service.ts
│   │   ├── Spotify/     # spotify.mapper.ts  ← capital S
│   │   ├── youtube/     # youtube.mapper.ts  ← lowercase y
│   │   └── oauth/       # oauth-callback.component.ts
│   ├── app.component.ts
│   ├── app.routes.ts
│   ├── app.config.ts
│   └── app.config.server.ts
```

### Where Features / Services / State Live Today

| Concern | Where |
|---|---|
| Playback state (signals) | `core/playback/playback-state.store.ts` |
| Playlist ordering logic | `features/music-player/services/play-list-logic.service.ts` |
| Cross-platform merge/shuffle | `features/music-player/services/omniplay.service.ts` |
| YouTube API integration | `features/music-player/services/youtube.service.ts` |
| Spotify API integration | `features/music-player/services/spotify.service.ts` |
| Adapter protocol (interface) | `core/playback/player-port.ts` |
| Adapter registry | `core/playback/adapter-registry.service.ts` |
| Playlist orchestration | `core/playback/playlist-instance.ts` |
| Data mappers | `features/youtube/youtube.mapper.ts`, `features/Spotify/spotify.mapper.ts` |
| Route definitions | `app.routes.ts` (not lazy-loaded) |
| Auth | `core/auth/` |
| Backend auth/data routes | `backend/routes/` (flat, no controller layer) |
| Backend domain logic | Mixed into route handlers and `backend/services/` |

### Inconsistent Patterns Observed

1. **Routes lack lazy loading.** `app.routes.ts` uses direct `component:` references — no `loadComponent`. Every feature is eagerly imported.
2. **Backend: no controller layer.** Route files (`routes/platforms.js`, `routes/users.js`) contain inline business logic, validation, and DB queries directly in router callbacks. There is no separate controller file.
3. **Writable signals exposed publicly.** `PlaybackStateStore` (`core/playback/playback-state.store.ts`) exposes public mutator methods directly (e.g. `setReady`, `setPlaying`) alongside the signals — the signals themselves are private, which is correct, but the mutation surface is fully public rather than intent-named. `YouTubeService` exposes `playlists`, `selectedPlaylist`, `playlistTracks`, `isLoading` as plain public writable `signal()` calls — any consumer can `.set()` them.
4. **Inconsistent folder casing.** `features/Spotify/` uses PascalCase; `features/youtube/` uses lowercase. File system is case-sensitive on Linux/CI.
5. **Empty service files.** `playback-coordinator.service.ts`, `music-player.service.ts`, and `platform-state.service.ts` are 1-line stubs — exist in the tree but contain no code. Creates confusion about what is implemented vs. planned.
6. **Mappers live outside their feature.** `youtube.mapper.ts` is at `features/youtube/` (top-level feature), while the YouTube service and adapters live inside `features/music-player/`. The mapper is split from the code that uses it.
7. **Inconsistent API response shapes.** Backend routes return varying envelope structures: some `{ playlists, total }`, some `{ has_access }`, some `{ error, message }`, some `{ errors: [] }` (array form). No unified `{ success, data, message }` envelope.
8. **`OmniplayService` has too many responsibilities.** It handles shuffle logic, debounce timers, merge/dedup, order-map persistence, platform change detection, post-change reshuffle grace windows, and logging — all in one service. This is a god-service candidate.
9. **`PlaylistInstanceService` in `core/` imports from `features/`.** `playlist-instance.ts` directly imports `PlayListLogicService` from `features/music-player/services/` and `AdapterRegistryService` from `core/`. The core layer is importing from features, which is a dependency direction violation.
10. **No `local` feature folder exists yet.** The `Song` model already has `platform: 'local'` as a union type member, but there is no `features/local/` folder, no local file service, no local adapter. This is Phase 1's primary gap.

---

## 3) Transferable Patterns (Apply Now)

### Pattern 1: Feature-First Folder for the `local` Subsystem
**Why it helps OmniPlay:** The Local-First MVP needs a new subsystem (local file scanning, local adapter, local playlist state). Dropping this into `features/music-player/services/` would deepen the existing god-feature problem. Creating `features/local/` keeps it bounded and isolated from day one.
**Where to apply:** `frontend/src/app/features/local/`
**Do this next:**
- Create `features/local/` with subfolders: `services/`, `adapters/`, `models/` (if needed)
- Put local file scanning logic in `features/local/services/local-library.service.ts`
- Put local playback adapter in `features/local/adapters/local-player.adapter.ts`
- Register the local adapter in `core/playback/adapter-registry.service.ts` (the only cross-boundary touch point — this is correct)

---

### Pattern 2: Read-Only Signal Exposure on New Services
**Why it helps OmniPlay:** `YouTubeService` currently exposes `playlists`, `selectedPlaylist`, `playlistTracks`, and `isLoading` as plain writable signals. Any component can mutate them. When the local service is built, prevent this from day one.
**Where to apply:** `features/local/services/local-library.service.ts` (new file); apply passively to `YouTubeService` and `SpotifyService` when next touched.
**Do this next:**
- In every new service, declare state signals as `private readonly _x = signal(...)` and expose `readonly x = this._x.asReadonly()`
- Do NOT rename existing signals in `YouTubeService`/`SpotifyService` today — just enforce the rule on all new code going forward

---

### Pattern 3: Standard API Response Envelope on New Backend Endpoints
**Why it helps OmniPlay:** The local-first feature may introduce new endpoints (e.g., file path indexing, local metadata). Standardizing the envelope now prevents a third inconsistent shape from being added.
**Where to apply:** Any new backend route files; passively retrofit `backend/routes/youtube.js` and `backend/routes/platforms.js` when next touched.
**Do this next:**
- Establish a convention: `{ success: true, data: {...} }` / `{ success: false, error: '...', statusCode: 400 }`
- Apply to every new route handler without touching existing routes
- Optionally add a `sendSuccess(res, data)` / `sendError(res, status, msg)` helper in `backend/middleware/` or `backend/utils/`

---

### Pattern 4: Dependency Direction Rule (features → core → shared, never sideways)
**Why it helps OmniPlay:** `core/playback/playlist-instance.ts` already imports from `features/music-player/services/play-list-logic.service.ts` — this is backwards. The rule stops this drift. When `features/local/` is built, its services must not import from `features/music-player/`.
**Where to apply:** Code review convention now; ESLint `import/no-restricted-paths` rule after Phase 1.
**Do this next:**
- Document the rule explicitly: features import from `core/` and `shared/` only — never from each other
- When next touching `playlist-instance.ts`, evaluate moving `PlayListLogicService` into `core/playback/` (it owns playlist state, which is a cross-feature concern)
- Any new local feature code must not import from `features/music-player/`

---

### Pattern 5: File Naming Convention (enforce on new files only)
**Why it helps OmniPlay:** `features/Spotify/` vs `features/youtube/` inconsistency will cause CI failures on Linux. New files should be consistent before the problem compounds.
**Where to apply:** All new files going forward.
**Do this next:**
- All new files: `kebab-case` folders, `.service.ts` / `.component.ts` / `.adapter.ts` / `.mapper.ts` suffixes
- Do NOT rename `features/Spotify/` today — add a task to rename it in a dedicated PR when safe
- New local feature: `features/local/` (lowercase, kebab)

---

### Pattern 6: Named Constants — No Magic Numbers in New Code
**Why it helps OmniPlay:** `OmniplayService` contains hardcoded values: `25` (debounce ms), `1500` (grace window ms), `5` (max shuffle attempts), `20` (retry attempts), `150` (retry interval ms). These are scattered and invisible. New local code should set the example.
**Where to apply:** `features/local/` (new), and passively in `omniplay.service.ts` when next touched.
**Do this next:**
- In `omniplay.service.ts`, extract to constants at the top of the file: `DEBOUNCE_MS`, `PLAYLIST_CHANGE_GRACE_MS`, `MAX_SHUFFLE_ATTEMPTS`, `MAX_ADAPTER_RETRY_ATTEMPTS`, `ADAPTER_RETRY_INTERVAL_MS`
- Enforce named constants in all new local subsystem code

---

### Pattern 7: Git Commit Type Convention
**Why it helps OmniPlay:** Zero code impact. Immediately makes the git history scannable, especially as multiple features develop in parallel.
**Where to apply:** All commits going forward.
**Do this next:**
- Use: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `test:`, `chore:`
- Branch names: `feature/local-file-scanner`, `fix/signal-exposure`, `refactor/omniplay-constants`

---

### Pattern 8: Component Type Classification (review only, no code change)
**Why it helps OmniPlay:** The existing component tree mixes concerns. Classifying what each component is — Feature (smart), Presentational (pure UI), or Layout (structure) — takes zero lines of code and creates a shared vocabulary for review.
**Where to apply:** `features/music-player/components/` (review pass)
**Do this next:**
- `platform-shell.component.ts` → Feature (smart: injects auth, yt, sp, router)
- `playlist-panel.component.ts` → Feature (smart)
- `song-item.component.ts` → likely Presentational (verify: should only receive data via inputs)
- `player-controls.component.ts` → Feature (smart: reads state)
- `progress-bar.component.ts` → likely Presentational
- Flag any Presentational component that injects a service — that's a god-component risk

---

### Pattern 9: `GET /health` Endpoint — Already Present
**Why it helps OmniPlay:** Already implemented in `backend/server.js:47`. No action needed. Confirmed.

---

### Pattern 10: Accessibility Baseline on New UI Components
**Why it helps OmniPlay:** The player controls have icon-only buttons (transport controls, volume). These need `aria-label`.
**Where to apply:** `features/music-player/components/footer/player-controls/` when next touched.
**Do this next:**
- Add `aria-label` to all icon-only interactive elements when next editing those components
- Add `role="status" aria-live="polite"` to loading state containers
- Enforce on all new local UI components from the start

---

## 4) Patterns to Defer (After Phase 1)

### Repository / Adapter Pattern for Data Access (Backend)
**Why deferred:** Backend routes currently call models directly (e.g., `PlatformConnection.findOne()`). Adding a full repository layer between service and model is a correct long-term step but is a non-trivial refactor of every route file. With Phase 1 focused on local-first (which may not need MongoDB at all), this adds complexity with no immediate payoff.
**When safe:** Phase 2, when a second data source (e.g., local SQLite or file-system index) creates a concrete need to swap the persistence layer without rewriting service logic.

---

### Backend Controller Layer (Fat Route Refactor)
**Why deferred:** `backend/routes/platforms.js` contains inline pagination helpers, normalization functions, business logic, and DB calls — all in one file. Splitting into `platforms.controller.js` + `platforms.service.js` is the right call but touches every existing backend test and import path.
**When safe:** Phase 2, once Phase 1 local-first endpoints are stable. Tackle one route domain at a time: start with `platforms`, then `users`, then `youtube`.

---

### Lazy Loading for Existing Routes
**Why deferred:** `app.routes.ts` uses eager `component:` references. Converting to `loadComponent()` requires verifying that all component dependencies are tree-shakeable and that SSR behavior (if any) is unaffected. This is a low-risk but non-trivial change to existing routing.
**When safe:** Phase 2. Apply lazily as each feature route is next touched. Do NOT do a one-shot conversion.

---

### ESLint `import/no-restricted-paths` Rule
**Why deferred:** Enforcing the dependency direction rule via ESLint requires configuring the rule correctly to reflect OmniPlay's folder boundaries without generating false positives on existing violations. Existing violations (like `core/` importing from `features/`) would immediately fail the lint check.
**When safe:** After Phase 1, once the existing violations are resolved manually. Then the ESLint rule acts as a guardrail, not a build-breaker from day one.

---

### Normalized State (`{ ids[], entities{} }`)
**Why deferred:** Current playlist state is a flat array in `PlayListLogicService`. For a library of hundreds of local tracks, efficient by-ID lookup may become necessary. But it's not needed now — the current array-based approach is simple and correct for the current scale.
**When safe:** Phase 2, if local library grows large enough that `findIndex` on every selection becomes a measurable performance issue.

---

### Cursor-Based Pagination
**Why deferred:** Current backend returns full lists for playlists and tracks. For a local-first MVP with a personal music library, offset pagination (already partially present in `platforms.js`) is entirely adequate.
**When safe:** Phase 3, if OmniPlay ever serves large shared libraries or cloud-scale catalogs.

---

### Full Ordered Middleware Pipeline
**Why deferred:** The Lilith blueprint's full pipeline (CORS → rate limiting → body parsing → auth → content mode → validation → controller → response) is production multi-user infrastructure. OmniPlay's backend is currently single-user local. Adding rate limiting, content mode middleware, and full validation middleware is premature.
**When safe:** Phase 3, before any public deployment or multi-user features.

---

### Content Mode / Privacy Isolation Architecture
**Why deferred:** These patterns are entirely domain-specific to Lilith's AI character platform. OmniPlay has no content gating requirement. Do not port these.
**When safe:** Never, unless OmniPlay adds a content-gating product requirement.

---

## 5) Minimal Structure Patch (Additive Only)

The following folder additions are proposed for the Local-First subsystem. **Nothing existing is moved or renamed.**

```
frontend/src/app/
├── features/
│   └── local/                             ← NEW feature domain
│       ├── services/
│       │   ├── local-library.service.ts   ← file scanning, indexing, metadata
│       │   └── local-library.state.ts     ← signal state container (private signals, readonly exposure)
│       ├── adapters/
│       │   └── local-player.adapter.ts    ← implements PlayerPort for local audio
│       └── models/
│           └── local-track.model.ts       ← if local tracks need fields beyond Song

backend/
└── routes/
    └── local.js                           ← NEW: local file endpoints (if backend assists)
                                           #   e.g., GET /api/local/scan, POST /api/local/index
```

**Wire-up touch points (minimal, additive):**
- `core/playback/adapter-registry.service.ts` — add `LocalPlayerAdapter` to the `get()` switch for `kind === 'local'`
- `app.routes.ts` — add route for `/platform/local` pointing to `PlatformShellComponent` (same shell, new platform param)
- `backend/server.js` — register `localRoutes` if a backend scan endpoint is needed

**Note:** If local playback is fully browser-side (Web Audio API / `<audio>` element with `file://` or `blob:` URLs), the backend route may not be needed at all during Phase 1. Build `features/local/` first; add a backend route only if the browser cannot handle the use case directly.

---

## 6) Rules Going Forward (Guardrails)

1. **New code must be feature-owned.** Any new domain logic lives in `features/<domain>/`. It does not go into `features/music-player/` unless it directly extends the existing music-player feature.

2. **Features depend only on `core/` and `shared/` — never on each other.** `features/local/` must not import from `features/music-player/`. `features/music-player/` must not import from `features/local/`. Cross-feature coordination routes through `core/playback/`.

3. **State is private-writable, public-readonly.** New state containers expose only `.asReadonly()` signals. Mutation happens exclusively through named methods on the state class. No public writable signals. (Current `YouTubeService` and `SpotifyService` are grandfathered — fix passively when next touched.)

4. **No god services.** A service that handles more than one domain concern must be split. `OmniplayService` is currently at risk — its shuffle logic, membership tracking, and debounce coordination should eventually be separate concerns. Do not add more responsibilities to it during Phase 1.

5. **No magic numbers.** Every hardcoded threshold, timeout, delay, or limit is a named constant at the top of its file. `const DEBOUNCE_MS = 25` not `setTimeout(..., 25)`.

6. **No cross-feature state imports.** Components must never inject another feature's state container directly. If `features/local/` needs playback state, it reads from `core/playback/playback-state.store.ts` — not from `features/music-player/services/`.

7. **Backend route handlers contain no business logic.** New route handlers translate HTTP ↔ service calls only. Validation, DB access, and domain logic belong in the service layer. Inline `if/else` platform-switching logic (as exists in `routes/platforms.js`) is a pattern to avoid in new routes.

8. **API responses use the standard envelope.** All new endpoints return `{ success: true, data: {...} }` or `{ success: false, error: '...', statusCode: N }`. Do not add a fourth response shape.

9. **New files follow naming conventions.** Folders: `kebab-case`. Files: `<name>.service.ts`, `<name>.component.ts`, `<name>.adapter.ts`, `<name>.state.ts`, `<name>.mapper.ts`. No PascalCase folders. (Existing `features/Spotify/` is grandfathered — rename in a dedicated clean-up PR.)

10. **Empty stub files are removed or implemented.** `playback-coordinator.service.ts`, `music-player.service.ts`, and `platform-state.service.ts` are 1-line stubs. They create confusion. Either implement them or delete them. Do not leave hollow files in the tree.

11. **Non-goals are documented.** Before starting any new feature, write a bullet list of what is explicitly out of scope for the current phase. This prevents scope creep during implementation.

12. **No `window.location.href` navigation.** All routing uses Angular's `router.navigate()` or `routerLink`. This is already the convention in the existing code — maintain it.

---

## 7) Phase 1 Alignment Check

### Confirmation
All structural changes recommended in Sections 3 and 5 are **additive only**. No existing file is renamed. No existing service is refactored. The proposed `features/local/` folder is a greenfield addition. The two touch points (adapter registry + app routes) are single-line additions to existing files.

Phase 1 momentum is **not disrupted** by:
- Creating `features/local/`
- Enforcing read-only signal exposure on new code only
- Adding named constants to new files
- Adopting the standard API envelope on new endpoints only
- Following naming conventions on new files only
- Documenting non-goals

### Risks and Mitigations

| Risk | Description | Mitigation |
|---|---|---|
| `PlayListLogicService` in features vs. core | `playlist-instance.ts` (core) imports `PlayListLogicService` (features). If the local adapter also needs playlist logic, this boundary is already broken and could worsen. | During Phase 1, accept the existing violation. Add a task to move `PlayListLogicService` to `core/playback/` in a dedicated Phase 1.5 cleanup PR before adding more consumers. |
| `OmniplayService` complexity | The service is already dense. If local tracks are merged into the OmniPlay pool, the service gains another data source and more branching. | Build `local-library.service.ts` to produce a list of `Song[]` with `platform: 'local'`. OmniPlay consumes that list through the same computed merge pattern already used for YouTube and Spotify — no new branching inside OmniplayService. |
| Local file access in browser | `platform: 'local'` requires the File System Access API or `<input type="file">`. This is browser-side; no backend route needed for Phase 1. | Build `local-player.adapter.ts` using Web Audio API / `<audio>`. Defer any backend file-scanning endpoint to Phase 2 if needed. |
| Folder casing issue (`features/Spotify/`) | Will cause silent failures on Linux CI. | Do not create new files inside `features/Spotify/`. Schedule a rename PR (`features/Spotify/` → `features/spotify/`) with a case-insensitive git move: `git mv features/Spotify features/spotify-tmp && git mv features/spotify-tmp features/spotify`. |
| Empty stub files causing import confusion | A developer may try to use `music-player.service.ts` thinking it's implemented. | Delete or implement all 1-line stubs before writing Phase 1 local code. Takes 5 minutes. |

---

## 8) Next 5 Actions

1. **Delete or implement the three empty stub files.**
   - `frontend/src/app/features/music-player/services/playback-coordinator.service.ts`
   - `frontend/src/app/features/music-player/services/music-player.service.ts`
   - `frontend/src/app/core/platform-state/platform-state.service.ts`
   If their functionality is needed, implement them. If not, delete them. Either is better than leaving hollow files in the tree.

2. **Extract magic numbers from `OmniplayService` into named constants.**
   In `frontend/src/app/features/music-player/services/omniplay.service.ts`, move `25`, `1500`, `5`, `20`, and `150` to named constants at the top of the file (`DEBOUNCE_MS`, `PLAYLIST_CHANGE_GRACE_MS`, `MAX_SHUFFLE_ATTEMPTS`, `MAX_ADAPTER_RETRY_ATTEMPTS`, `ADAPTER_RETRY_INTERVAL_MS`). Zero logic change. Takes 10 minutes. Sets the pattern.

3. **Create `frontend/src/app/features/local/` with its initial service skeleton.**
   Create `features/local/services/local-library.service.ts` with a `files` signal, a `loadFiles()` method (using `<input type="file" multiple>` or File System Access API), and a `toSongs()` method that maps `File[]` → `Song[]` with `platform: 'local'`. Expose all signals as `.asReadonly()`. This is the Phase 1 Local-First foundation.

4. **Create `features/local/adapters/local-player.adapter.ts` implementing `PlayerPort`.**
   Use a browser `<audio>` element internally. Implement `load()`, `start()`, `pause()`, `resume()`, `seek()`, `setVolume()`, `isReady()`, `isPlaying()`, `durationSeconds()`, `currentTimeSeconds()`. Register it in `core/playback/adapter-registry.service.ts` under `kind === 'local'`. Add a `/platform/local` route to `app.routes.ts`.

5. **Schedule the `features/Spotify/` → `features/spotify/` rename as a standalone PR.**
   Use `git mv` with an intermediate name to force a case-change on case-insensitive file systems. Merge before the local feature branch to avoid a merge conflict on the import paths in the mapper.
