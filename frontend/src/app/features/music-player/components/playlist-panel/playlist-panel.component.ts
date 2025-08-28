import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlaybackStateStore } from '../../../../core/playback/playback-state.store';
import { PlayListLogicService } from '../../services/play-list-logic.service';
import { YouTubeService } from '../../services/youtube.service';
import { SpotifyService } from '../../services/spotify.service';
import { Song } from '../../../../shared/models/song.model';
import { PlaylistInstanceService } from '../../../../core/playback/playlist-instance';

@Component({
  selector: 'app-playlist-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './playlist-panel.component.html',
  styleUrls: [
    './styles/design-system.css',
    './styles/playlist-panel.css',
    './styles/global-utils.css',
    
  ],
})
export class PlaylistPanelComponent {
  // ---- Inputs (to satisfy youtube.component.html bindings) -------------------
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' = 'youtube';
  // @Input() isYouTubeMode?: boolean; // (UNUSED) legacy input retained for potential template migrations

  // ---- DI -------------------------------------------------------------------
  private readonly state = inject(PlaybackStateStore); // state store currently not read directly in template
  private readonly playlistLogic = inject(PlayListLogicService);
  readonly youtubeService = inject(YouTubeService);
  readonly spotifyService = inject(SpotifyService);
  readonly c = inject(PlaylistInstanceService);
  // ---- State helpers the template can call ----------------------------------
  isEmpty(): boolean  { return this.playlistLogic.isEmpty(); }
  isSmall(): boolean  { return this.playlistLogic.isSmall(); }
  isMedium(): boolean { return this.playlistLogic.isMedium(); }
  isLarge(): boolean  { return this.playlistLogic.isLarge(); }
  realSongCount(): number { return this.playlistLogic.realSongCount(); }

  // Map current platform items into displayable Song[]
getDisplaySongs(): Song[] {
  if (this.platform === 'youtube') {
    return this.youtubeService.playlistTracks().map(t => ({
      id: t.id,
      name: t.title,
      artist: t.artist,
      platform: 'youtube',
      durationMs: typeof (t as any).duration_ms === 'number'
        ? (t as any).duration_ms
        : parseDurationToMs(t.duration),
      thumbnailUrl: t.thumbnail_url ?? undefined,
      uri: t.video_url ?? undefined,
      meta: { position: t.position }
    }));
  }

  if (this.platform === 'spotify') {
    // Prefer a normalized helper if you have it; otherwise map directly
    const songs = (this.spotifyService as any).toSongs?.();
    if (songs && Array.isArray(songs)) return songs;

    return this.spotifyService.playlistTracks().map((t: any) => ({
      id: t.id ?? t.track?.id ?? t.uri ?? t.track?.uri,
      name: t.title ?? t.name ?? t.track?.name,
      artist: t.artist ?? t.artists?.map((a: any) => a.name).join(', ') ?? t.track?.artists?.map((a: any) => a.name).join(', '),
      platform: 'spotify',
      durationMs: t.duration_ms ?? t.track?.duration_ms ?? 0,
      thumbnailUrl:
        t.thumbnail_url ??
        t.album?.images?.[0]?.url ??
        t.track?.album?.images?.[0]?.url ??
        undefined,
      uri: t.uri ?? t.track?.uri ?? undefined,
      meta: { position: t.position ?? t.track_number ?? undefined }
    }));
  }

  // For “other” platforms, 
  return this.playlistLogic.items();
}

  selectSong(song: Song): void {
    console.log('[Instance] selectSong()', { id: song?.id, platform: song?.platform, name: song?.name });
    const songs = this.getDisplaySongs();
    this.c.syncPlaylist(songs, song.id);
    this.c.selectTrack(song);
    this.c.setPlatform(song.platform as any);
  }

  // Playlist dropdown change
  onPlaylistChange(evt: Event): void {
    const id = (evt.target as HTMLSelectElement).value;
    if (!id) return;

    if (this.platform === 'youtube') {
      const pl = this.youtubeService.playlists().find(p => p.id === id);
      if (pl) this.youtubeService.selectPlaylist(pl);
      return;
    }

    if (this.platform === 'spotify') {
      const pl = this.spotifyService.playlists().find((p: any) => p.id === id);
      if ((this.spotifyService as any).selectPlaylist && pl) {
        (this.spotifyService as any).selectPlaylist(pl);
      }
      return;
    }
  }
}

/** "MM:SS" or "H:MM:SS" -> ms (0 if bad) */
function parseDurationToMs(s?: string): number {
  if (!s) return 0;
  const parts = s.split(':').map(n => parseInt(n, 10));
  if (parts.some(n => Number.isNaN(n))) return 0;
  if (parts.length === 2) {
    const [m, sec] = parts;
    return ((m * 60) + sec) * 1000;
  }
  if (parts.length === 3) {
    const [h, m, sec] = parts;
    return ((h * 3600) + (m * 60) + sec) * 1000;
  }
  return 0;
}