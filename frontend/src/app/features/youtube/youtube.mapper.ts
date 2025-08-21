import { Song } from '../../shared/models/song.model';
import { YouTubePlaylistTrack } from '../music-player/services/youtube.service';


// Parse "H:MM:SS" / "M:SS" → ms (null if invalid)
function parseDurationMs(input?: string): number | null {
  if (!input) return null;
  const parts = input.split(':').map(n => Number(n));
  if (parts.some(Number.isNaN)) return null;

  let sec = 0;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    sec = h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts;
    sec = m * 60 + s;
  } else if (parts.length === 1) {
    sec = parts[0];
  } else {
    return null;
  }
  return sec * 1000;
}

export function mapYouTubeTrackToSong(t: YouTubePlaylistTrack): Song {
  const durationMs = typeof t.duration_ms === 'number'
    ? t.duration_ms
    : parseDurationMs(t.duration);

  return {
    id: t.id,
    name: t.title,
    artist: t.artist,
    platform: 'youtube',
    durationMs,
    thumbnailUrl: t.thumbnail_url,
    externalUrl: t.video_url,
    uri: t.id,
    meta: { position: t.position }, // keep any extra fields you care about
  };
}

export function mapYouTubeTracksToSongs(tracks: YouTubePlaylistTrack[]): Song[] {
  return tracks.map(mapYouTubeTrackToSong);
}