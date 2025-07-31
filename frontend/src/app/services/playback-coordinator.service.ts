import { Injectable, inject } from '@angular/core';
import { MusicPlayerService } from './music-player.service';
import { YouTubeService, YouTubePlaylistTrack } from './youtube.service';
import { Song } from '../music-player/Models/song.model';

@Injectable({ providedIn: 'root' })
export class PlaybackCoordinatorService {
  private readonly musicPlayer = inject(MusicPlayerService);
  private readonly youtubeService = inject(YouTubeService);

  // Helper to convert YouTubePlaylistTrack to Song
  private toSong(track: YouTubePlaylistTrack): Song {
    return {
      id: track.id,
      name: track.title,
      artist: track.artist,
      duration: track.duration,
      video_url: track.video_url,
      thumbnail_url: track.thumbnail_url,
      isPlaceholder: false,
    };
  }
  // Navigation for YouTube playlists
  nextYouTubeSong(): void {
    const tracks = this.youtubeService.playlistTracks();
    const current = this.musicPlayer.currentTrack();
    if (!current) return;
    const currentIndex = tracks.findIndex(t => t.id === current.id);
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      const nextTrack = tracks[currentIndex + 1];
      this.musicPlayer.selectTrack(this.toSong(nextTrack));
    }
  }

  previousYouTubeSong(): void {
    const tracks = this.youtubeService.playlistTracks();
    const current = this.musicPlayer.currentTrack();
    if (!current) return;
    const currentIndex = tracks.findIndex(t => t.id === current.id);
    if (currentIndex > 0) {
      const prevTrack = tracks[currentIndex - 1];
      this.musicPlayer.selectTrack(this.toSong(prevTrack));
    }
  }
}