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
}

export interface FileRecord {
  key: string;         // same value as TrackRecord.id
  blob: Blob;
}

// ── Database class ─────────────────────────────────────────────────────────────

export class LocalMusicDb extends Dexie {
  tracks!: Table<TrackRecord, string>;
  files!: Table<FileRecord, string>;

  constructor() {
    super('omniplay-local-music');
    this.version(1).stores({
      tracks: 'id, title, artist, album, createdAt',
      files:  'key',
    });
  }
}

/** Singleton — one DB instance for the app lifetime. */
export const localDb = new LocalMusicDb();
