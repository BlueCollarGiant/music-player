import { Component, inject, signal } from '@angular/core';
import { MusicPlayerService } from '../../../../../../services/music-player.service';
import { PlayListLogic } from '../../../../../../services/play-list-logic.service';
import { MatDialogRef } from '@angular/material/dialog';
import { TimeService } from '../../../../../../services/time.service';

@Component({
  selector: 'app-song-form-dialog',
  imports: [],
  templateUrl: './song-form-dialog.component.html',
  styleUrls: ['./song-form-dialog.component.css']
})
export class SongFormDialogComponent {
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic)
  public timeService = inject(TimeService);
  // Inject the dialog reference for closing
dialogRef = inject(MatDialogRef<SongFormDialogComponent>);

// Form inputs
songName = signal('');
artistName = signal('');
duration = signal('');

// ----- on startup setup-----//
ngOnInit(): void {
  this.timeService.setHours('0');
  this.timeService.setMinutes('0');
  this.timeService.setSeconds('0');
}


// -----Methods area-----//
  submit(event: Event): void {
    event.preventDefault();  //prevent page reload
    (document.activeElement as HTMLElement)?.blur();
    this.timeService.updateDuration();
    this.playlistLogic.addSong({
      name: this.songName(),
      artist: this.artistName(),
      duration: this.timeService.duration(),
      id: Date.now() // or however you generate unique IDs
    });
    this.dialogRef.close();
  }

  cancel() {
    this.dialogRef.close();
  }

}
