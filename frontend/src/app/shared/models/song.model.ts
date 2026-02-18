
import { PlatformKind } from '../../core/playback/player-port'; // 'youtube' | 'spotify' | ...

export interface Song {
  id: string;
  name: string;
  artist?: string;
  platform: PlatformKind;

  /** Canonical duration in milliseconds (UI can format to M:SS). */
  durationMs?: number | null;
  thumbnailUrl?: string;

  /** Optional extras for previews/links. */
  previewUrl?: string | null;     // short audio preview if available
  externalUrl?: string | null;    // link out to platform page

  /** Platform-native locator (e.g., spotify:track:..., full URL, etc.) */
  uri?: string;

  /** Free-form bag for platform-specific metadata if you need it. */
  meta?: Record<string, unknown>;
}