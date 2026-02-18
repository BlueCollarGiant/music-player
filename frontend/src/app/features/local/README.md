# features/local — Local Playback Feature

## Purpose

This feature owns everything related to local audio file playback. It is the Phase 1 MVP priority for OmniPlay: a user can add local audio files, see them in a library, and play them with full transport controls — no account, no internet, no backend required.

## What lives here

```
features/local/
├── adapters/          # LocalPlayerAdapter — implements PlayerPort for local <audio>
└── services/          # LocalLibraryService — IndexedDB CRUD + tracks signal
                       # MetadataExtractorService — reads ID3/Vorbis tags from File objects
```

## Rules (mandatory — enforced at review)

### 1. Read-only signal exposure
All state signals are declared `private readonly _x = signal(...)` internally.
External consumers receive `readonly x = this._x.asReadonly()` only.
No public writable signals. No `.set()` or `.update()` calls from outside the service.

### 2. No cross-feature imports
This feature may import from:
- `core/` (PlayerPort, PlaybackStateStore, AdapterRegistry)
- `shared/` (Song model, utils)

This feature must NEVER import from:
- `features/music-player/`
- `features/spotify/`
- `features/youtube/`
- Any other feature folder

Cross-feature coordination goes through `core/playback/`.

### 3. PlayerPort adapter only
`LocalPlayerAdapter` implements the `PlayerPort` interface from `core/playback/player-port.ts`.
It wraps a single HTML5 `<audio>` element.
It does NOT know about IndexedDB, services, or UI components.

### 4. IndexedDB only for persistence
Local library state is stored in IndexedDB via Dexie.js.
No `localStorage` for track data (localStorage has a 5–10 MB limit).
No backend calls. No network requests. Local playback works 100% offline.

### 5. No backend involvement
`/platform/local` requires zero authentication.
`LocalLibraryService` never calls `HttpClient`.
If you are adding a backend route for local file storage, you are doing it wrong.

### 6. No magic numbers
All numeric thresholds, retry counts, and timing values are named constants
declared at the top of their file, above class declarations.

## Implementation status

- [ ] `adapters/local-player.adapter.ts` — PlayerPort impl (PR2)
- [ ] `services/local-library.service.ts` — IndexedDB CRUD + tracks signal (PR3)
- [ ] `services/metadata-extractor.service.ts` — tag parsing (PR3)

See `PROJECT.md` → Phase 1 Execution Plan for the full PR sequence.
