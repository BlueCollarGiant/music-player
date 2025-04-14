import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { PlayListLogic } from "../../../../../../services/play-list-logic.service";
import { MusicPlayerService } from "../../../../../../services/music-player.service";
import {MatDialogModule} from '@angular/material/dialog';
import {ChangeDetectionStrategy} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { SongFormDialogComponent } from "../song-form-dialog/song-form-dialog.component";

@Component({
  selector: 'app-song-form',
  imports: [CommonModule, MatButtonModule],
  templateUrl: './song-form.component.html',
  styleUrls: ['./song-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongFormComponent {
  public musicService = inject(MusicPlayerService);
  public playlistLogic = inject(PlayListLogic)
  readonly dialog = inject(MatDialog);

  openDialog(enterAnimationDuration: string, exitAnimationDuration: string): void {
    this.dialog.open(SongFormDialogComponent, {
      width: '300px',
      enterAnimationDuration,
      exitAnimationDuration,
    });

}}
