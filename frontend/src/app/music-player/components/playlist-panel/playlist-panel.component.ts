import { Component, inject, computed, Input, OnInit } from '@angular/core';
import { MusicPlayerService } from '../../../services/music-player.service';
import { PlayListLogic } from '../../../services/play-list-logic.service';
import { YouTubeService } from '../../../services/youtube.service';
import { SpotifyService } from '../../../services/spotify.service';
import { SharedModule } from '../../../shared/shared.module';
import { Song } from '../../Models/song.model';

@Component({
  selector: 'app-playlist-panel',
  imports: [SharedModule],
  templateUrl: './playlist-panel.component.html',
  styleUrls: [
    './styles/design-system.css',
    './styles/global-utils.css',
    './styles/song-list-container.css',
    './styles/song-item.css',
    './styles/playlist-dropdown.css',
    './styles/music-animations.css',
    './styles/mobile-responsive.css'
  ]
})
export class PlaylistPanelComponent implements OnInit {
  @Input() isYouTubeMode: boolean = false; // backward compatibility
  @Input() platform: 'youtube' | 'spotify' | 'soundcloud' | 'local' = 'youtube';
  
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic);
  public youtubeService = inject(YouTubeService);
  public spotifyService = inject(SpotifyService);

  // Computed signals for responsive playlist behavior
  readonly realSongCount = computed<number>(() => {
    if (this.platform === 'youtube') return this.youtubeService.playlistTracks().length;
    if (this.platform === 'spotify') return this.spotifyService.playlistTracks().length;
    return this.playlistLogic.realSongCount();
  });
  
  readonly isEmpty = computed<boolean>(() => this.realSongCount() === 0);
  
  readonly isSmall = computed<boolean>(() => this.realSongCount() > 0 && this.realSongCount() <= 3);
  
  readonly isMedium = computed<boolean>(() => this.realSongCount() > 3 && this.realSongCount() <= 8);
  
  readonly isLarge = computed<boolean>(() => this.realSongCount() > 8);

  ngOnInit(): void {
  if (this.platform === 'youtube') this.youtubeService.loadPlaylists();
  if (this.platform === 'spotify') this.spotifyService.loadPlaylists();
  }

  selectSong(song: Song) {
    this.musicService.selectTrack(song);
  }

  onPlaylistChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    
    if (this.platform === 'youtube') {
      const selectedPlaylist = this.youtubeService.playlists().find((p: any) => p.id === selectedValue);
      if (selectedPlaylist) this.youtubeService.selectPlaylist(selectedPlaylist);
    } else if (this.platform === 'spotify') {
      const selectedPlaylist = this.spotifyService.playlists().find((p: any) => p.id === selectedValue);
      if (selectedPlaylist) this.spotifyService.selectPlaylist(selectedPlaylist);
    }
  }

  getDisplaySongs(): Song[] {
    if (this.platform === 'youtube') return this.youtubeService.convertTracksToSongs();
    if (this.platform === 'spotify') {
      return this.spotifyService.playlistTracks().map(t => ({
        id: t.id,
        name: t.title,
        artist: t.artist,
        duration: t.duration,
        video_url: undefined,
        thumbnail_url: t.thumbnail_url,
        isPlaceholder: false
      }));
    }
    return this.playlistLogic.displaySongList();
  }
}
