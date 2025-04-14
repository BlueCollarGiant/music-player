import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../../../../../services/music-player.service';
import { PlayListLogic } from '../../../../../../services/play-list-logic.service';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

@Component({
  selector: 'app-song-form-dialog',
  imports: [],
  templateUrl: './song-form-dialog.component.html',
  styleUrls: ['./song-form-dialog.component.css']
})
export class SongFormDialogComponent {
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic)

  // Inject the dialog reference for closing
dialogRef = inject(MatDialogRef<SongFormDialogComponent>);

// Form inputs
songName = '';
artistName = '';
duration = '';



  submit() {
    this.playlistLogic.addSong({
      name: this.songName,
      artist: this.artistName,
      duration: this.duration,
      id: Date.now() // or however you generate unique IDs
    });

    this.dialogRef.close();
  }

}
