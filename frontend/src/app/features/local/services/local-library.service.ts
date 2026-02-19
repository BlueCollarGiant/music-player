import { Injectable, inject, signal } from '@angular/core';
import { Song } from '../../../shared/models/song.model';
import { localDb, TrackRecord } from './local-db';
import { MetadataExtractorService } from './metadata-extractor.service';

// ── Constants ──────────────────────────────────────────────────────────────────
/** Audio MIME types accepted by the file picker. */
const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav',
  'audio/flac', 'audio/aac', 'audio/webm', 'audio/x-m4a',
];

/**
 * LocalLibraryService
 *
 * Manages the local audio library stored in IndexedDB via Dexie.
 * Exposes a read-only signal of tracks as Song objects for the UI.
 * Never calls HttpClient. Works 100% offline.
 */
@Injectable({ providedIn: 'root' })
export class LocalLibraryService {
  private readonly extractor = inject(MetadataExtractorService);

  // Read-only signal exposure (rule: private writable, public asReadonly)
  private readonly _tracks = signal<Song[]>([]);
  readonly tracks = this._tracks.asReadonly();

  constructor() {
    this.loadFromDb();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Import one or more audio files into the library.
   * Each file is stored as a Blob in `files` and its metadata in `tracks`.
   */
  async importFiles(files: FileList | File[]): Promise<void> {
    const fileArray = Array.from(files).filter(f => this.isAudioFile(f));
    if (fileArray.length === 0) return;

    await Promise.all(fileArray.map(f => this.importOne(f)));
    await this.loadFromDb();
  }

  /**
   * Import a single track with user-supplied metadata.
   * All fields except `file` are optional; defaults are extracted from the file.
   */
  async importWithMetadata(opts: {
    file: File;
    title?: string;
    artist?: string;
    album?: string;
    cover?: File | null;
  }): Promise<void> {
    if (!this.isAudioFile(opts.file)) return;

    const id = crypto.randomUUID();
    const meta = await this.extractor.extract(opts.file);

    const trackRecord: TrackRecord = {
      id,
      title:      opts.title?.trim() || meta.title,
      artist:     opts.artist?.trim() || meta.artist,
      album:      opts.album?.trim()  || meta.album,
      durationMs: meta.durationMs,
      mimeType:   meta.mimeType,
      fileKey:    id,
      createdAt:  Date.now(),
      coverBlob:  opts.cover ?? undefined,
    };

    await localDb.transaction('rw', localDb.tracks, localDb.files, async () => {
      await localDb.tracks.add(trackRecord);
      await localDb.files.add({ key: id, blob: opts.file });
    });
    await this.loadFromDb();
  }

  /**
   * Remove a track, its blob, and any playlist membership rows from IndexedDB.
   */
  async removeTrack(trackId: string): Promise<void> {
    await localDb.transaction('rw', localDb.tracks, localDb.files, localDb.playlistTracks, async () => {
      await localDb.tracks.delete(trackId);
      await localDb.files.delete(trackId);
      await localDb.playlistTracks.where('trackId').equals(trackId).delete();
    });
    await this.loadFromDb();
  }

  /**
   * Returns a new blob URL for the given track ID.
   * The caller (LocalPlayerAdapter) is responsible for revoking the previous URL
   * before or after calling this.
   */
  async getPlayableUrl(trackId: string): Promise<string> {
    const record = await localDb.files.get(trackId);
    if (!record) throw new Error(`LocalLibraryService: no file found for track ${trackId}`);
    return URL.createObjectURL(record.blob);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async importOne(file: File): Promise<void> {
    const id = crypto.randomUUID();
    const meta = await this.extractor.extract(file);

    const trackRecord: TrackRecord = {
      id,
      title:     meta.title,
      artist:    meta.artist,
      album:     meta.album,
      durationMs: meta.durationMs,
      mimeType:  meta.mimeType,
      fileKey:   id,
      createdAt: Date.now(),
    };

    await localDb.transaction('rw', localDb.tracks, localDb.files, async () => {
      await localDb.tracks.add(trackRecord);
      await localDb.files.add({ key: id, blob: file });
    });
  }

  /** Reload the tracks signal from IndexedDB. */
  private async loadFromDb(): Promise<void> {
    const records = await localDb.tracks.orderBy('createdAt').toArray();
    this._tracks.set(records.map(r => this.toSong(r)));
  }

  private toSong(r: TrackRecord): Song {
    return {
      id:           r.id,
      name:         r.title,
      artist:       r.artist,
      platform:     'local',
      durationMs:   r.durationMs || null,
      thumbnailUrl: r.coverBlob ? URL.createObjectURL(r.coverBlob) : undefined,
      // uri intentionally absent; resolved on-demand via getPlayableUrl()
    };
  }

  private isAudioFile(file: File): boolean {
    if (ACCEPTED_AUDIO_TYPES.includes(file.type)) return true;
    // Fallback: check extension when MIME is blank (some browsers omit it)
    return /\.(mp3|mp4|m4a|ogg|wav|flac|aac|webm|opus)$/i.test(file.name);
  }
}
