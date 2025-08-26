import { Song } from '../../shared/models/song.model';
import { SpotifyTrack } from '../music-player/services/spotify.service';

// Parse "MM:SS" or "H:MM:SS" → ms (null if invalid)
function parseDurationMs(input?: string): number | null {
  if (!input) return null;
  const parts = input.split(':').map(Number);
  if (parts.some(n => Number.isNaN(n))) return null;

  let sec = 0;
  if (parts.length === 3) {
    const [h, m, s] = parts; sec = h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts; sec = m * 60 + s;
  } else if (parts.length === 1) {
    sec = parts[0];
  } else {
    return null;
  }
  return sec * 1000;
}

export function mapSpotifyTrackToSong(t: SpotifyTrack): Song {
  // Prefer numeric duration_ms if your backend ever adds it later; else parse string.
  const durationMs =
    (t as any).duration_ms && typeof (t as any).duration_ms === 'number'
      ? (t as any).duration_ms
      : parseDurationMs(t.duration);

  return {
    id: t.id,
    name: t.title,
    artist: t.artist,
    platform: 'spotify',
    durationMs,
    thumbnailUrl: t.thumbnail_url,
    externalUrl: t.external_url ?? null,
    uri: `spotify:track:${t.id}`,
    meta: { position: t.position, previewUrl: t.preview_url ?? null },
  };
}

export function mapSpotifyTracksToSongs(tracks: SpotifyTrack[]): Song[] {
  return tracks.map(mapSpotifyTrackToSong);
}