import { Injectable } from '@angular/core';

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  mimeType: string;
}

/**
 * MetadataExtractorService
 *
 * Extracts basic metadata from a File object.
 * PR3: title from filename only (no heavy ID3 dep added).
 * A future PR may swap in music-metadata-browser or jsmediatags if desired.
 */
@Injectable({ providedIn: 'root' })
export class MetadataExtractorService {
  /** Extract metadata from a File. Always resolves — falls back to filename on any error. */
  async extract(file: File): Promise<TrackMetadata> {
    const title = this.titleFromFilename(file.name);
    const durationMs = await this.probeDuration(file);
    return {
      title,
      artist: 'Unknown Artist',
      album:  'Unknown Album',
      durationMs,
      mimeType: file.type || 'audio/mpeg',
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private titleFromFilename(filename: string): string {
    // Strip extension, replace underscores/hyphens with spaces, trim
    return filename
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || filename;
  }

  /**
   * Probe audio duration by decoding a small slice via HTMLAudioElement.
   * Resolves to 0 if the browser can't determine it quickly.
   */
  private probeDuration(file: File): Promise<number> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const cleanup = (ms: number) => {
        URL.revokeObjectURL(url);
        audio.src = '';
        resolve(ms);
      };
      audio.addEventListener('durationchange', () => {
        const d = audio.duration;
        cleanup(isFinite(d) ? Math.round(d * 1000) : 0);
      }, { once: true });
      audio.addEventListener('error', () => cleanup(0), { once: true });
      // Timeout fallback — don't block import if browser is slow
      setTimeout(() => cleanup(0), 3000);
      audio.src = url;
      audio.load();
    });
  }
}
