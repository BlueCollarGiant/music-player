import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { PlayListLogic } from "../../../../../../services/play-list-logic.service";
import { MusicPlayerService } from "../../../../../../services/music-player.service";
import {MatButtonModule} from '@angular/material/button';
import {MatDialog,} from '@angular/material/dialog';
import { SongFormDialogComponent } from "../song-form-dialog/song-form-dialog.component";
import { SharedModule } from "../../../../../../shared/shared.module";

@Component({
  selector: 'app-song-form',
  imports: [SharedModule, MatButtonModule],
  templateUrl: './song-form.component.html',
  styleUrls: ['./song-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongFormComponent {
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic)
  readonly dialog = inject(MatDialog);

    openDialog(): void {
    this.dialog.open(SongFormDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      autoFocus: false
    });


}}
