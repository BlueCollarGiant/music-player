import Dexie, { type Table } from 'dexie';

// ── Schema types ───────────────────────────────────────────────────────────────

export interface TrackRecord {
  id: string;          // crypto.randomUUID()
  title: string;
  artist: string;
  album: string;
  durationMs: number;  // 0 if unknown
  mimeType: string;
  fileKey: string;     // FK → FileRecord.key
  createdAt: number;   // Date.now()
  coverBlob?: Blob;    // optional user-supplied cover art
}

export interface FileRecord {
  key: string;         // same value as TrackRecord.id
  blob: Blob;
}

export interface PlaylistRecord {
  id: string;          // crypto.randomUUID()
  name: string;
  createdAt: number;   // Date.now()
}

export interface PlaylistTrackRecord {
  playlistId: string;
  trackId: string;
  order: number;       // append index for ordering
}

// ── Database class ─────────────────────────────────────────────────────────────

export class LocalMusicDb extends Dexie {
  tracks!: Table<TrackRecord, string>;
  files!: Table<FileRecord, string>;
  playlists!: Table<PlaylistRecord, string>;
  playlistTracks!: Table<PlaylistTrackRecord, [string, string]>;

  constructor() {
    super('omniplay-local-music');
    this.version(1).stores({
      tracks: 'id, title, artist, album, createdAt',
      files:  'key',
    });
    // Version 2: added optional coverBlob field to TrackRecord (no index needed)
    this.version(2).stores({
      tracks: 'id, title, artist, album, createdAt',
      files:  'key',
    });
    // Version 3: added playlists and playlistTracks tables
    this.version(3).stores({
      tracks:         'id, title, artist, album, createdAt',
      files:          'key',
      playlists:      'id, name, createdAt',
      playlistTracks: '[playlistId+trackId], playlistId, trackId',
    });
  }
}

/** Singleton — one DB instance for the app lifetime. */
export const localDb = new LocalMusicDb();
