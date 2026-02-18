# OmniPlay — Master Project Plan

---

## 1. Product Vision

OmniPlay is a self-custody music player that puts the user's local library first. Platform integrations are optional. Cloud sync comes later. The user owns their music experience — no account required to play local files.

---

## 2. Core Identity

### What OmniPlay Is
- A local-first music player that works offline with zero accounts
- An adapter-based playback system that can plug into any audio source
- A single unified library across local files and streaming platforms
- A tool the user controls — their files, their library, their data

### What OmniPlay Is Not
- Not a streaming service
- Not a social music platform
- Not a Spotify/YouTube replacement — it integrates with them optionally
- Not a cloud-first app — cloud is a sync layer, not a dependency

---

## 3. Phase Strategy

### Phase 1 — Local-First MVP

**Goal:** A user can add local audio files, see them in a library, play them with full transport controls, and have the library persist across sessions. No account. No backend. No internet required.

**Definition of Done:**
- [ ] User can import audio files (mp3, flac, wav, ogg) via file picker or drag-and-drop
- [ ] Metadata extracted from files (title, artist, duration)
- [ ] Tracks appear in a persistent local library (survives refresh/close)
- [ ] Clicking a track plays it through HTML5 `<audio>`
- [ ] All transport controls work: play, pause, next, prev, seek, volume
- [ ] Progress bar and time display update in real-time
- [ ] User can remove tracks from library
- [ ] Works entirely offline — no backend calls for local playback

**Explicit Non-Goals (Phase 1):**
- No new platform adapters (SoundCloud, Apple Music)
- No UI redesign or theme overhaul
- No playlist creation/editing for local tracks (flat library only)
- No cloud sync, accounts, or backend dependency for local features
- No audio transcoding or format conversion
- No album art fetching from external services
- No refactoring of existing YouTube/Spotify adapters
- No mobile-specific layouts

**Architectural Constraints:**
- `LocalPlayerAdapter` must implement the existing `PlayerPort` interface — no exceptions
- Local library state lives entirely in the frontend (IndexedDB)
- Audio file blobs stored in IndexedDB alongside metadata
- No new backend routes or models for local playback
- `Song` model already supports `platform: 'local'` — use it, don't fork it
- All new code follows existing patterns: standalone components, signals, services

### Phase 1.5 — Firebase Auth Migration

**Goal:** Replace custom backend auth (bcrypt passwords, JWT issuance, Passport Google login) with Firebase Auth. Any user can sign in without being on a platform OAuth allowlist.

**Why this is a prerequisite for public release (not Phase 2):**
- Google OAuth test mode caps the app at 100 manually allowlisted users. No public MVP is possible behind this gate.
- Custom password auth is a security liability we shouldn't carry to production.
- Firebase Auth is a one-time migration that unblocks everything downstream — platform integrations, cloud sync, admin features.

**Scope:**
- Add `firebase` and `firebase-admin` packages (frontend + backend)
- Frontend: replace `AuthService` login/register methods with Firebase Auth SDK calls
- Frontend: swap JWT interceptor to attach Firebase ID tokens instead
- Backend: replace `middleware/auth.js` JWT decode with `firebase-admin.auth().verifyIdToken()`
- Backend: remove `POST /login`, `POST /users` registration, `services/jwt.js`, bcrypt password fields from User model
- Backend: keep Passport YouTube/Spotify OAuth callbacks — re-key `PlatformConnection` lookups to Firebase UID
- Migrate existing users (if any) to Firebase Auth accounts
- Verify: local playback still requires zero auth, platform "Connect" flows still work

**Explicit Non-Goals (Phase 1.5):**
- No new platform OAuth flows
- No UI redesign of login/signup screens beyond swapping the auth mechanism
- No cloud sync features
- No changes to local playback or adapter system

### Phase 2 — Integration Expansion

**Goal:** Polish existing YouTube/Spotify integrations. Unified library view mixing local + platform tracks. Optional new platform adapters.

**Boundaries:**
- YouTube and Spotify adapters already work — only fix bugs, don't rewrite
- Unified library merges local + platform tracks using `OmniplayService` patterns
- New adapters (SoundCloud) follow `PlayerPort` interface
- Backend only changes if a new platform requires new OAuth routes

### Phase 3 — Cloud Sync

**Goal:** Optional account + cloud backup. IndexedDB syncs to cloud storage. Multi-device library access.

**Boundaries:**
- Cloud is a sync layer, not the source of truth — local IndexedDB remains primary
- Backend stores metadata + file references (not raw audio unless user opts in)
- Offline-first: app works without cloud, syncs when connected

---

## 4. Architecture Overview

### Frontend Layers
```
core/
├── auth/                  # Firebase Auth, OAuth, guards, interceptor
└── playback/              # PlaybackStateStore, PlayerPort, PlaylistInstance, AdapterRegistry

features/music-player/
├── adapters/
│   ├── youtube/           # YouTubePlayerAdapter (PlayerPort impl)
│   └── spotify/           # SpotifyPlayerAdapter (PlayerPort impl)
├── components/            # Platform shell, playlist panel, right panel, player controls
└── services/              # YouTube, Spotify, Omniplay, PlaylistLogic

features/local/            # Owns all local playback and library state
├── adapters/              # LocalPlayerAdapter (PlayerPort impl) — wraps HTML5 <audio>
└── services/              # LocalLibraryService (IndexedDB CRUD + tracks signal)
                           # MetadataExtractorService (ID3/Vorbis tag parsing)
                           # Depends only on core/playback and shared/models

shared/models/             # Song interface (unified track model)
```

### Backend Responsibility
The backend handles:
- Verifying Firebase ID tokens (Firebase Admin SDK) — replacing custom JWT auth
- Platform OAuth token management (YouTube, Spotify) keyed by Firebase UID
- Proxying platform API calls (playlists, tracks)
- Admin dashboard
- Avatar/profile management

The backend does NOT handle:
- User password storage or custom credential management (Firebase owns this)
- Local file storage
- Local library state
- Local playback
- Anything that should work offline

### Adapter System
Every playback source implements `PlayerPort`:
```
PlayerPort (interface)
├── YouTubePlayerAdapter   — YouTube iFrame API
├── SpotifyPlayerAdapter   — Spotify Web Playback SDK
└── LocalPlayerAdapter     — HTML5 <audio> element (planned)
```

`PlaylistInstance` orchestrates playback. It uses `AdapterRegistry` to get the right adapter for a track's platform, then calls `load()` → `start()`. Platform switching is automatic — if you play a YouTube track then a local track, the adapter swaps transparently.

### Data Model

**Song** (unified track interface):
```typescript
interface Song {
  id: string;
  name: string;
  artist?: string;
  platform: PlatformKind;
  durationMs?: number | null;
  thumbnailUrl?: string;
  previewUrl?: string | null;
  externalUrl?: string | null;
  uri?: string;
  meta?: Record<string, unknown>;
}
```

**PlatformKind** (after PR1): `'youtube' | 'spotify' | 'soundcloud' | 'omniplay' | 'local'`
Currently `'soundcloud'` and `'local'` are redundantly added as extra union members on `Song.platform`. PR1 consolidates them into `PlatformKind` so there's a single source of truth.

---

## 5. Local-First Architecture Plan

### LocalPlayerAdapter
- Implements `PlayerPort` with `kind: 'local'`
- Wraps a single HTML5 `<audio>` element
- `load(track)`: Creates object URL from IndexedDB blob, sets `audio.src`
- `start()`: Calls `audio.play()`
- `pause()/resume()`: Direct `audio` API calls
- `seek(seconds)`: Sets `audio.currentTime`
- `setVolume(value)`: Sets `audio.volume` (0.0–1.0)
- Position tracking: `timeupdate` event or polling `audio.currentTime`
- State bridge syncs to `PlaybackStateStore` (same pattern as YouTube/Spotify adapters)

### IndexedDB Strategy
Two object stores:
1. **`tracks`** — Song metadata (id, name, artist, durationMs, filename, mimeType, addedAt)
2. **`audioFiles`** — Binary blobs keyed by track ID

Why two stores: metadata queries should be fast and not load multi-MB blobs into memory.

Library: Use `Dexie.js` for IndexedDB access (typed, promise-based, battle-tested).

### Library State Ownership
- `LocalLibraryService` owns the local track list
- Exposes signals: `tracks: Signal<Song[]>`, `isLoading: Signal<boolean>`
- Methods: `addFiles(FileList)`, `removeTrack(id)`, `getAllTracks()`, `getTrackBlob(id)`
- Loads from IndexedDB on app init
- No backend involvement

### File Ingest Pipeline
```
User drops files
  → FileList
  → MetadataExtractor.extract(file) → { name, artist, durationMs, mimeType }
  → LocalLibraryService.addFiles()
  → Write metadata to IndexedDB 'tracks' store
  → Write blob to IndexedDB 'audioFiles' store
  → Update tracks signal
  → UI re-renders
```

---

## 6. Authentication Strategy

### Why Firebase Auth

The current backend uses custom JWT auth with bcrypt password hashing and Passport.js OAuth. This creates three problems:

1. **Google OAuth test mode** — Google's OAuth consent screen in test mode limits access to a manually maintained allowlist of 100 users. Until the app passes Google's verification review, only the developer can realistically use YouTube/Spotify integrations.
2. **Custom credential risk** — Storing and managing user passwords in our own backend increases security surface area. Password reset flows, brute-force protection, and credential storage are solved problems we shouldn't re-solve.
3. **App login blocked by platform restrictions** — If the only way to log in is Google OAuth (which is test-restricted) or a custom email/password system (which we'd rather not maintain), new users can't get in.

Firebase Auth decouples app identity from platform OAuth. A user can sign into OmniPlay via Firebase (Google sign-in, email/password, or any Firebase provider) without needing Spotify or YouTube access. Platform connections become optional add-ons.

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (Angular)                             │
│                                                 │
│  Firebase Auth SDK                              │
│    → Sign in (Google, email/password, etc.)     │
│    → Get Firebase ID token                      │
│    → Attach ID token to API requests            │
│                                                 │
│  Platform OAuth (separate flows)                │
│    → "Connect Spotify" button → backend OAuth   │
│    → "Connect YouTube" button → backend OAuth   │
│    → Tokens stored per Firebase UID             │
└──────────────────┬──────────────────────────────┘
                   │ Firebase ID token in Authorization header
                   ▼
┌─────────────────────────────────────────────────┐
│  Backend (Express)                              │
│                                                 │
│  Firebase Admin SDK                             │
│    → Verify ID token on every request           │
│    → Extract UID → look up user in MongoDB      │
│                                                 │
│  Platform OAuth (Passport.js, unchanged)        │
│    → /auth/spotify, /auth/youtube callbacks      │
│    → Store tokens in PlatformConnection by UID  │
│                                                 │
│  No password storage. No custom JWT issuance.   │
└─────────────────────────────────────────────────┘
```

### Principles

- **App identity = Firebase.** OmniPlay login is Firebase Auth. The backend never stores passwords or issues its own JWTs.
- **Platform connections are optional add-ons.** Spotify/YouTube OAuth flows are "Connect" actions, not login methods. They store tokens keyed by Firebase UID.
- **Local-first requires zero auth.** `/platform/local` works without any login — Firebase or otherwise. Auth is only required for platform integrations and cloud features.
- **Backend verifies, never issues.** The backend uses Firebase Admin SDK to verify ID tokens. It does not create sessions, issue JWTs, or manage password resets.

### Migration Path

The current custom auth system (bcrypt passwords, JWT issuance, Passport Google login) will be replaced:

| Current | After Migration |
|---------|----------------|
| `POST /login` (email + bcrypt) | Firebase Auth SDK `signInWithEmailAndPassword()` |
| `POST /users` (registration) | Firebase Auth SDK `createUserWithEmailAndPassword()` |
| Backend JWT issuance (`services/jwt.js`) | Firebase ID tokens (issued by Firebase, verified by backend) |
| `middleware/auth.js` (decode custom JWT) | `firebase-admin.auth().verifyIdToken(token)` |
| Passport Google OAuth for login | Firebase Auth Google provider (frontend-only) |
| Passport YouTube/Spotify OAuth | Stays as-is — "Connect" flows, not login |

---

## 7. System Boundaries

| Concern | Belongs In | Never In |
|---------|-----------|----------|
| Local file storage | Frontend (IndexedDB) | Backend |
| Local playback | Frontend (`<audio>`) | Backend |
| Library metadata | Frontend (IndexedDB) | Backend (Phase 1) |
| App login / identity | Firebase Auth (frontend SDK + backend Admin SDK) | Custom backend JWT/password |
| Platform OAuth tokens | Backend (Passport, keyed by Firebase UID) | Frontend |
| Platform API calls | Backend (routes/services) | Frontend direct |
| Playback state | Frontend (PlaybackStateStore) | Backend |
| User profiles | Backend (MongoDB, keyed by Firebase UID) | Frontend localStorage |
| Password storage | Never (Firebase owns this) | Backend |
| Audio file transcoding | Never (out of scope) | — |

---

## 8. Extension Seams

### PlayerPort
Already defined at `core/playback/player-port.ts`. Every new audio source implements this interface. No changes to the interface for Phase 1.

### TrackSource Abstraction
Not yet formalized. Currently each platform service (YouTube, Spotify) independently loads tracks. For Phase 2, define:
```typescript
interface TrackSource {
  kind: string;
  loadPlaylists(): Promise<Playlist[]>;
  loadTracks(playlistId: string): Promise<Song[]>;
}
```
**Do not build this in Phase 1.** Just be aware it's coming so you don't create patterns that fight it.

### StorageProvider Abstraction
For Phase 3 (cloud sync). Defines:
```typescript
interface StorageProvider {
  saveTracks(tracks: Song[]): Promise<void>;
  loadTracks(): Promise<Song[]>;
  saveFile(id: string, blob: Blob): Promise<void>;
  loadFile(id: string): Promise<Blob>;
}
```
Phase 1 implementation: IndexedDB directly via `LocalLibraryService`.
Phase 3: Extract interface, add cloud implementation, sync engine chooses.

**Do not build the abstraction in Phase 1.** Build concrete IndexedDB code. Extract the interface when cloud sync is actually needed.

---

## 9. Technical Guardrails

1. **No rewrites unless blocking.** YouTube and Spotify adapters work. Don't touch them in Phase 1.
2. **No UI redesign during Phase 1.** Reuse existing playlist panel and player controls. New components only for file import.
3. **No new platforms until local is stable.** SoundCloud, Apple Music, etc. wait for Phase 2.
4. **No premature abstractions.** Build `LocalLibraryService` as concrete IndexedDB code. Don't build `StorageProvider` interface until Phase 3 needs it.
5. **No backend changes for local features.** Local playback is 100% frontend. If you're adding a backend route for local files, you're doing it wrong.
6. **No new dependencies without justification.** Dexie.js for IndexedDB and optionally `music-metadata-browser` for metadata extraction. That's it.
7. **Follow existing patterns.** Standalone components, Angular signals, services with signal-based state. No RxJS unless the existing code already uses it in that area.
8. **One adapter, one responsibility.** `LocalPlayerAdapter` handles `<audio>`. `LocalLibraryService` handles IndexedDB. They don't know about each other's internals.
9. **No password storage or custom credential auth in our backend.** Firebase Auth owns identity. The backend verifies Firebase ID tokens — it never hashes passwords, issues JWTs, or manages password resets.
10. **App login must not be blocked by platform OAuth test restrictions.** Firebase Auth is the login gate. A user who has never connected Spotify or YouTube can still sign in, access their profile, and use local playback.

---

## 10. MVP Release Criteria Checklist

### Core Functionality
- [ ] Import audio files (mp3, flac, wav, ogg) via file picker
- [ ] Import audio files via drag-and-drop
- [ ] Metadata extraction: title, artist, duration
- [ ] Fallback metadata from filename when tags are missing
- [ ] Tracks displayed in local library list
- [ ] Click track → plays via `<audio>`
- [ ] Play / pause works
- [ ] Next / previous track works
- [ ] Seek via progress bar works
- [ ] Volume control works
- [ ] Time display (current / total) updates correctly
- [ ] Remove track from library

### Persistence
- [ ] Library survives page refresh
- [ ] Library survives browser close/reopen
- [ ] Audio blobs persist in IndexedDB (no re-import needed)

### Integration
- [ ] `LocalPlayerAdapter` registered in `AdapterRegistry`
- [ ] `'local'` added to `PlatformKind`
- [ ] `/platform/local` route navigable
- [ ] Platform switching works: local → youtube → local without crashes
- [ ] Existing YouTube/Spotify playback unaffected

### Quality
- [ ] No console errors during normal local playback flow
- [ ] Handles invalid/corrupt audio files gracefully (skip, show error)
- [ ] Handles large libraries (100+ tracks) without visible lag

---

## 11. Future Considerations (Not Now)

These are acknowledged, scoped out, and deferred:

- **Playlist management for local tracks** — Phase 2 (flat library is fine for MVP)
- **Album art extraction from audio tags** — Nice-to-have, not blocking
- **Audio visualizer for local tracks** — Cosmetic, defer
- **Keyboard shortcuts** — Phase 2
- **Mobile/responsive layout** — Phase 2
- **SoundCloud adapter** — Phase 2
- **Unified search across sources** — Phase 2
- **Firebase Auth migration** — Phase 1.5 (prerequisite for public release, see Authentication Strategy)
- **Cloud sync / backup** — Phase 3
- **Multi-device library** — Phase 3
- **Public/shared playlists** — Phase 3
- **Offline caching of platform tracks** — Phase 3
- **Audio transcoding** — Never (out of scope)

---

## Phase 1 Execution Plan (Active)

---

### 1) File Touch Map

#### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/app/core/playback/player-port.ts` | Add `'local'` to `PlatformKind` union |
| `frontend/src/app/shared/models/song.model.ts` | Consolidate `Song.platform` to `PlatformKind` (remove redundant `\| 'soundcloud' \| 'local'`) |
| `frontend/src/app/core/playback/adapter-registry.service.ts` | Import + register `LocalPlayerAdapter` |
| `frontend/src/app/core/playback/playlist-instance.ts` | Update `setPlatform()` to accept `PlatformKind` (remove hardcoded union + `as any` cast) |
| `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.ts` | Replace local `PlatformName` with `PlatformKind` import, add `'local'` route detection + no-auth early return |
| `frontend/src/app/app.config.ts` | Import and spread `provideLocalAdapter()` |
| `frontend/src/app/app.routes.ts` | No change needed — `/platform/local` already works via `:platform` param |
| `frontend/package.json` | Add `dexie` and `music-metadata-browser` dependencies |

#### New Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/app/features/local/adapters/index.ts` | Barrel export |
| `frontend/src/app/features/local/adapters/local-player.adapter.ts` | `PlayerPort` impl wrapping `<audio>` |
| `frontend/src/app/features/local/adapters/local-state-manager.ts` | Ready/playing/duration/position signals |
| `frontend/src/app/features/local/adapters/local-position-tracker.ts` | `timeupdate` listener → position signal |
| `frontend/src/app/features/local/adapters/local-playback-controller.ts` | load/start/pause/resume/seek |
| `frontend/src/app/features/local/adapters/local-volume-controller.ts` | setVolume/mute |
| `frontend/src/app/features/local/adapters/local-state-bridge.ts` | Sync adapter state → `PlaybackStateStore` |
| `frontend/src/app/features/local/services/local-library.service.ts` | IndexedDB CRUD, `tracks` signal, `getTrackBlob()` |
| `frontend/src/app/features/local/services/local-db.ts` | Dexie schema definition (tracks + audioFiles stores) |
| `frontend/src/app/features/local/services/metadata-extractor.service.ts` | Parse ID3/Vorbis tags from audio files |
| `frontend/src/app/features/music-player/components/file-import/file-import.component.ts` | Drag-drop + file picker UI |
| `frontend/src/app/features/music-player/components/file-import/file-import.component.html` | Template |
| `frontend/src/app/features/music-player/components/file-import/file-import.component.css` | Styles |

---

### 2) Implementation Steps

#### Step 1 — Extend PlatformKind + Registry Scaffolding

**Goal:** The type system and DI know `'local'` exists. No functionality yet.

**Why:** Every downstream file (adapters, components, services) switches on `PlatformKind`. Adding it first prevents type errors when building the adapter.

**Files:**
- `frontend/src/app/core/playback/player-port.ts` — add `'local'` to union
- `frontend/src/app/features/local/adapters/index.ts` — barrel with stub export
- `frontend/src/app/features/local/adapters/local-player.adapter.ts` — skeleton class, `kind: 'local'`, all methods no-op
- `frontend/src/app/core/playback/adapter-registry.service.ts` — import + add `case 'local'`
- `frontend/src/app/app.config.ts` — spread `provideLocalAdapter()`
- `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.ts` — add `'local'` to `PlatformName`, add case in `resolvePlatformFromUrl()` and `loadPlaylistsFor()`

**Risks:**
- `PlatformShellComponent.loadPlaylistsFor('local')` must not require auth. Add an early return that skips platform connection checks.
- `PlaylistInstance.setPlatform()` has a hardcoded type union `'youtube' | 'spotify' | 'soundcloud'` — must add `'local'`.

#### Step 2 — LocalPlayerAdapter Plays Audio

**Goal:** Navigate to `/platform/local`, hardcode a test `Song` with an object URL, click play, hear audio.

**Why:** Proves the adapter → state bridge → UI controls pipeline works end-to-end before adding persistence or import.

**Files:**
- `frontend/src/app/features/local/adapters/local-player.adapter.ts` — full implementation
- `frontend/src/app/features/local/adapters/local-state-manager.ts`
- `frontend/src/app/features/local/adapters/local-position-tracker.ts`
- `frontend/src/app/features/local/adapters/local-playback-controller.ts`
- `frontend/src/app/features/local/adapters/local-volume-controller.ts`
- `frontend/src/app/features/local/adapters/local-state-bridge.ts`

**What changes:**
- Create `<audio>` element in adapter constructor (not in DOM — headless)
- `load(track)` → `audio.src = track.uri` (object URL or blob URL)
- `start()` → `audio.play()`
- `pause()` → `audio.pause()`
- `resume()` → `audio.play()`
- `seek(s)` → `audio.currentTime = s`
- `setVolume(v)` → `audio.volume = v`
- `mute()` → `audio.muted = true`
- Position tracker listens to `timeupdate` event
- State bridge writes to `PlaybackStateStore` on every state change
- `teardown()` → revoke object URL, pause, reset src

**Risks:**
- Object URL memory leaks if not revoked on track change. `load()` must revoke previous URL.
- `<audio>` autoplay may be blocked by browser policy. `start()` must be called from user gesture context (click handler). This is already the case — `selectTrack()` is triggered by click.

#### Step 3 — IndexedDB Persistence

**Goal:** Tracks and audio blobs persist in IndexedDB. Library loads on app startup.

**Why:** Without persistence, users lose their library on every refresh.

**Files:**
- `frontend/src/app/features/local/services/local-db.ts` — Dexie DB definition
- `frontend/src/app/features/local/services/local-library.service.ts` — CRUD service with signals
- `frontend/src/app/features/local/services/metadata-extractor.service.ts` — tag parsing

**What changes:**
- Dexie schema: `tracks` table (id, name, artist, durationMs, mimeType, filename, addedAt), `audioFiles` table (id, blob)
- `LocalLibraryService`:
  - `tracks = signal<Song[]>([])` — loaded from IndexedDB on init
  - `addFiles(files: FileList)` — extract metadata → write to both stores → update signal
  - `removeTrack(id)` — delete from both stores → update signal
  - `getTrackBlob(id)` → `Promise<Blob>` — used by adapter's `load()`
- `MetadataExtractorService`:
  - `extract(file: File)` → `{ name, artist, durationMs, mimeType }`
  - Uses `music-metadata-browser` for ID3/Vorbis/FLAC tags
  - Fallback: parse filename → strip extension → split on ` - ` for artist/title

**Risks:**
- IndexedDB storage quota varies by browser. Large libraries (10GB+) may hit limits. Not a Phase 1 concern — document and move on.
- `music-metadata-browser` is ~200KB gzipped. Acceptable for the value it provides.

#### Step 4 — Import UI

**Goal:** User can add files via drag-and-drop or file picker. Tracks appear in playlist panel.

**Why:** This is the primary user-facing feature of the MVP.

**Files:**
- `frontend/src/app/features/music-player/components/file-import/file-import.component.ts`
- `frontend/src/app/features/music-player/components/file-import/file-import.component.html`
- `frontend/src/app/features/music-player/components/file-import/file-import.component.css`
- `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.ts` — conditionally show file-import when platform is `'local'`
- `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.html` — add `<app-file-import>` block
- `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel.component.ts` — read from `LocalLibraryService.tracks` when platform is `'local'`

**What changes:**
- File import component: drop zone + hidden `<input type="file" multiple accept="audio/*">`
- On drop/select: calls `LocalLibraryService.addFiles()`
- Playlist panel: when platform is `'local'`, display `localLibrary.tracks()` instead of YouTube/Spotify playlists
- Song click: calls `PlaylistInstance.selectTrack(song)` — adapter routes to `LocalPlayerAdapter` automatically
- Remove button on each track: calls `LocalLibraryService.removeTrack(id)`

**Risks:**
- Drag-and-drop needs `dragover`/`drop` event handlers with `preventDefault()`. Easy to get wrong with Angular event binding.
- Playlist panel currently assumes platform playlists with a playlist selector dropdown. For local, skip the dropdown and show a flat track list. Guard with `if (platform === 'local')`.

#### Step 5 — Wiring, Edge Cases, Empty States

**Goal:** Polish. Handle empty library, corrupt files, platform switching, cleanup.

**Why:** Without this, the MVP feels broken on edge cases.

**Files:**
- All files from previous steps (minor patches)
- `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel.component.html` — empty state message

**What changes:**
- Empty library state: "Drop audio files here or click to import"
- Invalid file handling: skip non-audio files silently, show toast/console warning for corrupt audio
- Platform switching: local → youtube → local must not leak `<audio>` or object URLs
- `teardown()` on `LocalPlayerAdapter` must revoke object URLs and reset state
- Verify: YouTube/Spotify playback still works identically (regression check)

---

### 3) PR Plan

#### PR1: `local/platform-type`
**Branch:** `feat/local-platform-type`
**Scope:** Type changes and scaffold only. Zero functionality.

**Exact type changes required:**

1. **`player-port.ts`** — Add `'local'` to `PlatformKind`:
   ```typescript
   // BEFORE
   export type PlatformKind = 'youtube' | 'spotify' | 'soundcloud' | 'omniplay';
   // AFTER
   export type PlatformKind = 'youtube' | 'spotify' | 'soundcloud' | 'omniplay' | 'local';
   ```

2. **`song.model.ts`** — Make `Song.platform` use `PlatformKind` only (remove redundant union members now that `'local'` is in `PlatformKind`):
   ```typescript
   // BEFORE
   platform: PlatformKind | 'soundcloud' | 'local';
   // AFTER
   platform: PlatformKind;
   ```
   `'soundcloud'` and `'local'` are already in `PlatformKind` after the change above — the extra union was a workaround.

3. **`playlist-instance.ts`** — Update `setPlatform()` to accept `PlatformKind` instead of hardcoded union:
   ```typescript
   // BEFORE
   setPlatform(kind: 'youtube' | 'spotify' | 'soundcloud') {
     this.state.setPlatformKind(kind as any);
   }
   // AFTER
   setPlatform(kind: PlatformKind) {
     this.state.setPlatformKind(kind);
   }
   ```
   Import `PlatformKind` from `./player-port`. Remove the `as any` cast — no longer needed.

4. **`platform-shell.component.ts`** — Add `'local'` to route detection and ensure local does not require auth or load remote playlists:
   ```typescript
   // BEFORE
   type PlatformName = 'youtube' | 'spotify' | 'soundcloud' | 'omniplay';
   // AFTER — replace with PlatformKind import (same type now)
   import { PlatformKind } from '../../../../core/playback/player-port';
   // Use PlatformKind everywhere PlatformName was used

   // resolvePlatformFromUrl() — add case:
   if (url.includes('/platform/local')) return 'local';

   // loadPlaylistsFor() — add case:
   if (p === 'local') {
     // Local platform: no auth required, no remote playlist loading
     // Library loading handled by LocalLibraryService (PR3)
     return;
   }
   ```

5. **`adapter-registry.service.ts`** — Import stub + add `case 'local'`:
   ```typescript
   case 'local': return this.local;
   ```

6. **`app.config.ts`** — Spread `provideLocalAdapter()`:
   ```typescript
   ...provideLocalAdapter(),
   ```

7. **New files (scaffold):**
   - `features/local/adapters/index.ts` — barrel export
   - `features/local/adapters/local-player.adapter.ts` — stub class, `kind: 'local'`, all methods no-op/throw

**Files touched:**
- `frontend/src/app/core/playback/player-port.ts`
- `frontend/src/app/shared/models/song.model.ts`
- `frontend/src/app/core/playback/playlist-instance.ts`
- `frontend/src/app/core/playback/adapter-registry.service.ts`
- `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.ts`
- `frontend/src/app/app.config.ts`
- `frontend/src/app/features/local/adapters/index.ts` (new)
- `frontend/src/app/features/local/adapters/local-player.adapter.ts` (new, stub)

**Test checklist:**
- [ ] `ng build` succeeds with zero errors
- [ ] `/platform/local` route loads without crash
- [ ] `/platform/local` makes zero backend/auth calls
- [ ] `/platform/youtube` still works
- [ ] `/platform/spotify` still works
- [ ] No console errors on any platform route
- [ ] No TypeScript type errors (verify `Song.platform` assignments compile without casts)

---

#### PR2: `local/audio-adapter`
**Branch:** `feat/local-audio-adapter`
**Scope:** Full `LocalPlayerAdapter` implementation. Plays audio from object URL.
**Files:**
- `frontend/src/app/features/local/adapters/local-player.adapter.ts`
- `frontend/src/app/features/local/adapters/local-state-manager.ts` (new)
- `frontend/src/app/features/local/adapters/local-position-tracker.ts` (new)
- `frontend/src/app/features/local/adapters/local-playback-controller.ts` (new)
- `frontend/src/app/features/local/adapters/local-volume-controller.ts` (new)
- `frontend/src/app/features/local/adapters/local-state-bridge.ts` (new)

**Test checklist:**
- [ ] Hardcoded test song plays audio
- [ ] Play/pause/resume works
- [ ] Seek via progress bar works
- [ ] Volume slider works
- [ ] Mute/unmute works
- [ ] Time display updates during playback
- [ ] Next/prev does not crash (even with single track)
- [ ] Switch to YouTube, switch back to local — no crash, no audio leak

---

#### PR3: `local/indexeddb-persistence`
**Branch:** `feat/local-indexeddb`
**Scope:** IndexedDB storage + metadata extraction. Library persists.
**Files:**
- `frontend/package.json` (add `dexie`, `music-metadata-browser`)
- `frontend/src/app/features/local/services/local-db.ts` (new)
- `frontend/src/app/features/local/services/local-library.service.ts` (new)
- `frontend/src/app/features/local/services/metadata-extractor.service.ts` (new)

**Test checklist:**
- [ ] `addFiles()` writes metadata + blob to IndexedDB
- [ ] `getAllTracks()` returns persisted tracks after refresh
- [ ] `removeTrack()` deletes from both stores
- [ ] `getTrackBlob()` returns correct blob
- [ ] Metadata extraction works for mp3, flac, ogg, wav
- [ ] Filename fallback works when tags are empty
- [ ] Library signal updates reactively

---

#### PR4: `local/import-ui`
**Branch:** `feat/local-import-ui`
**Scope:** File import component + playlist panel integration.
**Files:**
- `frontend/src/app/features/music-player/components/file-import/file-import.component.ts` (new)
- `frontend/src/app/features/music-player/components/file-import/file-import.component.html` (new)
- `frontend/src/app/features/music-player/components/file-import/file-import.component.css` (new)
- `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.ts`
- `frontend/src/app/features/music-player/components/platform-shell/platform-shell.component.html`
- `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel.component.ts`
- `frontend/src/app/features/music-player/components/playlist-panel/playlist-panel.component.html`

**Test checklist:**
- [ ] File picker opens and accepts audio files
- [ ] Drag-and-drop zone works
- [ ] Imported tracks appear in playlist panel
- [ ] Clicking imported track plays it
- [ ] Remove track button works
- [ ] Empty library shows import prompt
- [ ] Non-audio files are rejected silently

---

#### PR5: `local/edge-cases`
**Branch:** `feat/local-edge-cases`
**Scope:** Polish, error handling, cleanup, regression verification.
**Files:** Patches across all prior files.

**Test checklist:**
- [ ] Corrupt audio file handled gracefully (skip + warning)
- [ ] Large file import (100+ files) does not freeze UI
- [ ] Object URLs revoked on track change and teardown
- [ ] Platform switch: local → youtube → spotify → local — no crashes
- [ ] YouTube playback fully functional (regression)
- [ ] Spotify playback fully functional (regression)
- [ ] Library persists after browser close + reopen
- [ ] Empty states render correctly

---

### 4) Verification Checklist (Definition of Done)

**Local-first works without auth:**
- [ ] `/platform/local` loads without login
- [ ] No backend calls made during local playback
- [ ] No network requests for local track operations

**Import works:**
- [ ] File picker accepts mp3, flac, wav, ogg
- [ ] Drag-and-drop accepts same formats
- [ ] Metadata extracted (title, artist, duration)
- [ ] Filename fallback when tags missing

**Library persists:**
- [ ] Tracks survive page refresh
- [ ] Tracks survive browser restart
- [ ] Audio blobs remain playable after persistence

**Playback controls work:**
- [ ] Play / pause
- [ ] Resume from paused position
- [ ] Seek via progress bar
- [ ] Next / previous track
- [ ] Volume slider
- [ ] Mute / unmute
- [ ] Time display accurate

**No regressions:**
- [ ] YouTube adapter works identically
- [ ] Spotify adapter works identically
- [ ] Omniplay mode works identically
- [ ] OAuth flows unaffected
- [ ] `ng build --configuration=production` succeeds

---

### 5) Progress Tracker

**PR1 — Platform Type + Scaffold**
- [ ] Add `'local'` to `PlatformKind` in `player-port.ts`
- [ ] Consolidate `Song.platform` to `PlatformKind` (remove redundant `| 'soundcloud' | 'local'`)
- [ ] Update `setPlatform()` in `playlist-instance.ts` to accept `PlatformKind` (remove hardcoded union + `as any` cast)
- [ ] Create adapter stub + barrel export (`features/local/adapters/`)
- [ ] Register `LocalPlayerAdapter` in `AdapterRegistry`
- [ ] Add `provideLocalAdapter()` in `app.config.ts`
- [ ] Replace `PlatformName` with `PlatformKind` in `PlatformShellComponent`
- [ ] Add `/platform/local` route detection (no auth, no remote playlist loading)
- [ ] Verify build + no type errors + no regressions

**PR2 — Audio Adapter**
- [ ] Implement `LocalPlayerAdapter` (all `PlayerPort` methods)
- [ ] State manager + position tracker
- [ ] Playback + volume controllers
- [ ] State bridge → `PlaybackStateStore`
- [ ] Verify playback end-to-end

**PR3 — IndexedDB Persistence**
- [ ] Dexie schema (tracks + audioFiles)
- [ ] `LocalLibraryService` with signals
- [ ] `MetadataExtractorService`
- [ ] Install `dexie` + `music-metadata-browser`
- [ ] Verify persistence across refresh

**PR4 — Import UI**
- [ ] File import component (drag-drop + picker)
- [ ] Wire into platform shell
- [ ] Playlist panel reads local library
- [ ] Track click → playback
- [ ] Remove track

**PR5 — Edge Cases + Polish**
- [ ] Error handling for corrupt files
- [ ] Object URL cleanup
- [ ] Platform switching stability
- [ ] Empty states
- [ ] Full regression pass

---

---

## Rules Going Forward

These rules apply to all new code written in this repo. They are not retroactively enforced on existing code, but existing violations should be resolved passively (when a file is next touched) or in a dedicated cleanup PR.

**1. No empty stub files.**
A file that exists in the repo must contain real, working code. If a planned file has no implementation yet, do not create the file. An empty placeholder does more harm than no file — it misleads developers about what is implemented. The three stubs (`playback-coordinator.service.ts`, `music-player.service.ts`, `platform-state.service.ts`) were deleted in PR0.

**2. New code must be feature-owned.**
All new domain logic lives inside its feature folder (`features/<domain>/`). It does not go into `features/music-player/` unless it directly extends that existing feature. Local playback code lives in `features/local/`. Future features get their own folders.

**3. Features depend only on `core/` and `shared/` — never on each other.**
`features/local/` must not import from `features/music-player/`. `features/music-player/` must not import from `features/local/`. Cross-feature coordination routes through `core/playback/`. If Feature A needs something from Feature B, the shared concern belongs in `core/` or `shared/`, not copied across.

**4. State is private-writable, public-readonly.**
In all new service and state files: signals are declared `private readonly _x = signal(...)` and exposed as `readonly x = this._x.asReadonly()`. No public writable signals. Components and external consumers must call named methods to trigger mutations — they must not `.set()` or `.update()` signals directly. (Existing `YouTubeService` and `SpotifyService` are grandfathered; fix passively when next touched.)

**5. No magic numbers.**
Every numeric threshold, timeout, delay, retry count, or limit is a named constant declared at the top of its file, above the class declaration. `const DEBOUNCE_MS = 25` — not `setTimeout(..., 25)`. Names must describe the purpose, not the value.

**6. No new endpoints without the standard API envelope.**
All new backend route handlers return one of:
- `{ success: true, data: { ... } }` for success
- `{ success: false, error: 'message', statusCode: N }` for errors

Do not add a fourth response shape. Existing endpoints are grandfathered; apply the envelope when next touched.

**7. No god-services for new work.**
A service that owns more than one domain concern must be split before it ships. If a new service starts accumulating shuffle logic, debounce coordination, platform tracking, AND logging, that is a signal to extract. `OmniplayService` is the cautionary example — do not repeat its pattern in new code.

**8. Backend route handlers contain no business logic.**
New route handlers translate HTTP ↔ service calls only. Validation, DB queries, and domain logic belong in a service. Inline platform-switching `if/else` chains in route files (as exist in `routes/platforms.js`) are a pattern to avoid in new routes.

**9. No cross-feature state imports in components.**
A component must never inject another feature's state container directly. If a component inside `features/local/` needs playback state, it reads from `core/playback/playback-state.store.ts` — not from any service inside `features/music-player/`.

**10. Local playback requires zero authentication.**
`/platform/local` must load and function without any login, Firebase token, or backend call. Any guard, interceptor, or service that blocks the local route on missing auth is a bug. Local-first is not a second-class feature.

**11. New files follow naming conventions.**
Folders: `kebab-case`. File suffixes: `.service.ts`, `.component.ts`, `.adapter.ts`, `.state.ts`, `.mapper.ts`, `.model.ts`. No PascalCase folders. The existing `features/Spotify/` folder is grandfathered — it will be renamed in the Cleanup PR (see below).

**12. No `window.location.href` for navigation.**
All routing uses Angular `router.navigate()` or `routerLink`. Never `window.location.href` for in-app navigation.

---

## Cleanup PR Plan

These are housekeeping items that are correct to fix but too disruptive to mix into feature PRs. Each is a standalone PR with a single concern.

### PR0 — Structure Cleanup (complete)
**Branch:** `chore/pr0-structure-cleanup`
**Scope:** Landmine removal and structural scaffolding. Zero behavior changes.
- [x] Delete three empty 1-line stub files: `playback-coordinator.service.ts`, `music-player.service.ts`, `platform-state.service.ts`
- [x] Create `features/local/` folder scaffold with `adapters/`, `services/`, `README.md`
- [x] Extract magic number constants in `OmniplayService` (`DEBOUNCE_MS`, `PLAYLIST_CHANGE_GRACE_MS`, `MAX_SHUFFLE_ATTEMPTS`)
- [x] Add "Rules Going Forward" and "Cleanup PR Plan" to `PROJECT.md`

### PR0.5 — Casing Fix: `features/Spotify/` → `features/spotify/`
**Branch:** `chore/fix-spotify-folder-casing`
**Scope:** Rename only. Zero logic changes.
**Why deferred:** Renaming a folder on a case-insensitive file system (Windows/macOS) requires a two-step git move to force the rename. Mixing this into a feature PR creates merge conflict risk. It must be its own PR, merged before any PR that adds files to the Spotify feature.
**Steps:**
```bash
git mv frontend/src/app/features/Spotify frontend/src/app/features/spotify-tmp
git mv frontend/src/app/features/spotify-tmp frontend/src/app/features/spotify
# Update import in features/music-player/services/spotify.service.ts and spotify.mapper.ts
```
**Risk:** Low. Only the mapper import path changes. Verify `ng build` passes.
**When:** Before Phase 2 work touches Spotify. Not blocking Phase 1 local-first.

### PR-Backend-Controllers — Split Fat Routes into Controller Layer
**Branch:** `refactor/backend-controller-layer`
**Scope:** Backend only. Move business logic out of route handlers into dedicated controller files. One domain at a time: `platforms` first, then `users`, then `youtube`.
**Why deferred:** Existing routes are working and tested. Splitting them mid-Phase 1 risks breaking platform OAuth flows. Safe to do after Phase 1 local-first is shipped and stable.
**When:** Phase 2, before adding any new platform.

### PR-Lazy-Routes — Convert Eager Routes to `loadComponent()`
**Branch:** `refactor/lazy-routes`
**Scope:** `app.routes.ts` only. Convert each `component:` reference to `loadComponent(() => import(...))`. Verify SSR behavior is unaffected.
**Why deferred:** Eager loading is not causing any current problem. Converting incorrectly can break SSR or produce circular import errors. Low urgency for a single-user local-first app.
**When:** Phase 2, once all Phase 1 routes are stable.

---

## Reference

- **Detailed architecture analysis:** `omniplay-repo-audit.md`
- **Gap report + migration plan:** `findings.md`
- **Environment config:** `.env` (root, gitignored)
- **Frontend proxy:** `frontend/proxy.conf.json` → backend on port 3000
- **Tech stack:** Angular 20 / Node.js / Express / MongoDB / Firebase Auth (planned) / Dexie.js (planned)
