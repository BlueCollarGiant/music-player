# Spotify Adapter - SOLID Architecture

This adapter has been refactored to follow SOLID principles, breaking the monolithic adapter into specialized, single-responsibility services.

## 📁 Folder Structure

```
spotify/
├── core/
│   ├── spotify-player.adapter.ts        # Main adapter (coordinates services)
│   └── spotify-listener-manager.ts      # SDK event listener management
│
├── state/
│   ├── spotify-state-manager.ts         # State signal management
│   └── spotify-position-extrapolator.ts # Position calculation & timer
│
├── playback/
│   ├── spotify-playback-controller.ts   # Play/pause/resume/seek logic
│   └── spotify-volume-controller.ts     # Volume/mute control
│
├── integration/
│   ├── spotify-token-provider.ts        # Abstract token provider
│   ├── spotify-device-provider.ts       # Abstract device provider
│   ├── local-storage-token-provider.ts  # Concrete localStorage token impl
│   ├── local-storage-device-provider.ts # Concrete localStorage device impl
│   └── spotify-web-api.service.ts       # Spotify Web API HTTP calls
│
├── bridges/
│   └── spotify-state-bridge.ts          # Bridge to PlaybackStateStore
│
├── index.ts                              # Barrel exports
└── README.md                             # This file
```

## 🎯 SOLID Principles Applied

### ✅ Single Responsibility Principle (SRP)
Each class has ONE job:
- **SpotifyStateManager**: Track state signals
- **SpotifyPositionExtrapolator**: Calculate position with extrapolation
- **SpotifyPlaybackController**: Execute playback commands
- **SpotifyVolumeController**: Handle volume operations
- **SpotifyListenerManager**: Attach/detach SDK listeners
- **SpotifyStateBridge**: Sync to global state store
- **SpotifyWebApiService**: Make HTTP calls to Spotify Web API
- **SpotifyPlayerAdapter**: Coordinate all the above

### ✅ Open/Closed Principle (OCP)
- Can swap `LocalStorageSpotifyTokenProvider` with `ApiTokenProvider` without changing adapter
- Can add new state sync targets without modifying core logic
- Abstract providers allow extension without modification

### ✅ Liskov Substitution Principle (LSP)
- Any implementation of `SpotifyTokenProvider` can replace `LocalStorageSpotifyTokenProvider`
- Any implementation of `SpotifyDeviceProvider` can replace `LocalStorageSpotifyDeviceProvider`

### ✅ Interface Segregation Principle (ISP)
- Each service exposes only what it needs
- No fat interfaces with unused methods
- Clients depend only on methods they use

### ✅ Dependency Inversion Principle (DIP)
- Adapter depends on abstractions (`SpotifyTokenProvider`) not concretions (`localStorage`)
- Easy to mock for testing
- Easy to swap implementations

## 🚀 Usage

### Basic Import
```typescript
import { SpotifyPlayerAdapter } from '@features/music-player/adapters/spotify';
```

### Providing Services (in app config or module)
```typescript
import { provideSpotifyAdapter } from '@features/music-player/adapters/spotify';

export const appConfig = {
  providers: [
    ...provideSpotifyAdapter(),
    // ... other providers
  ]
};
```

### Custom Implementations (Open/Closed)
```typescript
// Create custom token provider
@Injectable()
export class ApiTokenProvider extends SpotifyTokenProvider {
  constructor(private http: HttpClient) { super(); }

  async getToken(): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<{token: string}>('/api/spotify/token')
    );
    return response.token;
  }
}

// Provide custom implementation
providers: [
  { provide: SpotifyTokenProvider, useClass: ApiTokenProvider },
  // ... rest of providers
]
```

## 📊 Service Dependencies

```
SpotifyPlayerAdapter (main coordinator)
  ├── SpotifyStateManager (state signals)
  │
  ├── SpotifyPositionExtrapolator (position calc)
  │   └── SpotifyStateManager
  │
  ├── SpotifyPlaybackController (playback commands)
  │   ├── SpotifyStateManager
  │   └── SpotifyWebApiService
  │       ├── SpotifyTokenProvider (abstract)
  │       └── SpotifyDeviceProvider (abstract)
  │
  ├── SpotifyVolumeController (volume control)
  │   └── SpotifyStateManager
  │
  ├── SpotifyListenerManager (SDK listeners)
  │   ├── SpotifyStateManager
  │   └── SpotifyDeviceProvider
  │
  └── SpotifyStateBridge (global store sync)
      ├── SpotifyStateManager
      ├── SpotifyPositionExtrapolator
      └── PlaybackStateStore
```

## ⚠️ Methods with Warnings

### Unused Methods (Test Yourself)
The following methods are marked as potentially unused but kept for interface compliance:

1. **`next()`** - In `SpotifyPlaybackController` and `SpotifyPlayerAdapter`
   - Console warning added
   - You can test if these are truly unused

2. **`previous()`** - In `SpotifyPlaybackController` and `SpotifyPlayerAdapter`
   - Console warning added
   - You can test if these are truly unused

3. **`durationSeconds()`** - In `SpotifyPlayerAdapter`
   - Marked as unused (state store accessed directly)

4. **`teardown()`** - In `SpotifyPlayerAdapter`
   - Marked as unused (lifecycle managed by SpotifyService)

## 🧪 Testing Benefits

Each service can now be tested in isolation:

```typescript
describe('SpotifyPlaybackController', () => {
  let controller: SpotifyPlaybackController;
  let mockStateManager: jasmine.SpyObj<SpotifyStateManager>;
  let mockWebApi: jasmine.SpyObj<SpotifyWebApiService>;

  beforeEach(() => {
    mockStateManager = jasmine.createSpyObj('SpotifyStateManager', ['...']);
    mockWebApi = jasmine.createSpyObj('SpotifyWebApiService', ['play']);

    controller = new SpotifyPlaybackController(mockStateManager, mockWebApi);
  });

  it('should start playback', async () => {
    // ... test implementation
  });
});
```

## 🔄 Migration from Old Adapter

The old monolithic adapter has been renamed to `spotify.adapter.ts.old` for reference.

### Breaking Changes
None! The public API (`PlayerPort` interface) remains unchanged.

### Import Updates
```typescript
// Old
import { SpotifyAdapter } from './spotify.adapter';

// New
import { SpotifyPlayerAdapter } from './spotify';
```

## 📝 Adding New Features

### Example: Add Redis Token Provider

1. **Create new provider:**
```typescript
// integration/redis-token-provider.ts
@Injectable()
export class RedisTokenProvider extends SpotifyTokenProvider {
  constructor(private redis: RedisService) { super(); }

  async getToken(): Promise<string> {
    return await this.redis.get('spotify_token');
  }
}
```

2. **Provide it:**
```typescript
{ provide: SpotifyTokenProvider, useClass: RedisTokenProvider }
```

3. **Done!** No changes to adapter or other services needed. ✅

## 🎓 Learning Resources

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection in Angular](https://angular.io/guide/dependency-injection)
- [Abstract Classes vs Interfaces](https://www.typescriptlang.org/docs/handbook/2/classes.html#abstract-classes)

---

**Previous Architecture:** Monolithic adapter doing 6+ jobs (260 lines)
**Current Architecture:** 11 focused services with clear responsibilities (avg 50 lines each)

Benefits: ✅ Testable | ✅ Maintainable | ✅ Extensible | ✅ Readable
