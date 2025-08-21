import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Song } from '../../../shared/models/song.model';
import { SpotifyService } from './spotify.service';
import { PlaybackStateStore } from '../../../core/playback/playback-state.store';
import { PlaybackCoordinatorService } from './playback-coordinator.service';
import { getYouTubeId, getSafeVideoUrl as utilSafeUrl, getVideoEmbedUrl as utilEmbedUrl } from '../../../shared/utils/youtube.util';
import { YouTubeService } from './youtube.service';
import { PreviewAudioService } from './preview-audio.service';


/** @deprecated Legacy bridge. Prefer ControlsFacade + Coordinator directly. */
@Injectable({ providedIn: 'root' })
export class MusicPlayerService {
  // DI
  
  private readonly yt = inject(YouTubeService);
  private readonly sp = inject(SpotifyService);
  private readonly state = inject(PlaybackStateStore);
  private readonly coord = inject(PlaybackCoordinatorService);
 

  // ── state passthroughs (keep existing bindings working) ────────────────────
  readonly activeTab        = this.state.activeTab;
  readonly tabs             = this.state.tabs;
  readonly isPlaying        = this.state.isPlaying as any;
  readonly currentProgress  = this.state.currentProgress as any;
  readonly currentTime      = this.state.currentTimeFmt as any;
  readonly currentTrack     = this.state.currentTrack as any;
  readonly audioBars        = this.state.audioBars as any;

}  