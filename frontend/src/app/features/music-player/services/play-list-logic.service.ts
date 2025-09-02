import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../../../shared/models/song.model';

// Single responsibility: manage a playlist (order, selection, persistence)
@Injectable({ providedIn: 'root' })
export class PlayListLogicService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'music-player-playlist';

  // ── State ──────────────────────────────────────────────────────────────────
  private readonly itemsSig = signal<Song[]>(this.load() || []);
  /** -1 means “none selected” */
  private readonly indexSig = signal<number>(-1);

  // ── Derived ────────────────────────────────────────────────────────────────
  
  readonly items = computed(() => this.itemsSig());
  readonly size = computed(() => this.itemsSig().length);
  readonly isEmpty = computed(() => this.size() === 0);
  readonly hasSelection = computed(
    () => this.indexSig() >= 0 && this.indexSig() < this.size()
  );
  /** Currently selected item, or null */
  readonly current = computed(() =>
    this.hasSelection() ? this.itemsSig()[this.indexSig()] : null
  );

  // Optional “display” + size buckets for UI layouts
  readonly displaySongList = computed(() => this.items()); 
  readonly realSongCount   = computed(() => this.size());
  readonly isSmall  = computed(() => this.realSongCount() > 0 && this.realSongCount() <= 3);
  readonly isMedium = computed(() => this.realSongCount() > 3 && this.realSongCount() <= 8);
  readonly isLarge  = computed(() => this.realSongCount() > 8);
    index: any;

  // ── Persistence ────────────────────────────────────────────────────────────
  private load(): Song[] | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as Song[]) : null;
    } catch {
      return null;
    }
  }
  private save(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.itemsSig()));
    } catch {}
  }

  // ── Mutations (all persist) ────────────────────────────────────────────────
  set(list: Song[], selectIndex: number = list.length ? 0 : -1): void {
    this.itemsSig.set([...list]);
    this.indexSig.set(this.clampIndex(selectIndex));
    this.save();
  }

  clear(): void {
    this.itemsSig.set([]);
    this.indexSig.set(-1);
    this.save();
  }

  add(song: Song, select = false): void {
    const next = [...this.itemsSig(), song];
    this.itemsSig.set(next);
    if (select) this.indexSig.set(next.length - 1);
    this.save();
  }

  addMany(songs: Song[], selectFirst = false): void {
    const start = this.itemsSig().length;
    this.itemsSig.update(arr => [...arr, ...songs]);
    if (selectFirst && songs.length) this.indexSig.set(start);
    this.save();
  }

  removeById(id: string): void {
    const idx = this.itemsSig().findIndex(s => s.id === id);
    if (idx < 0) return;

    const next = [...this.itemsSig()];
    next.splice(idx, 1);
    this.itemsSig.set(next);

    // fix selection
    if (this.indexSig() >= next.length) this.indexSig.set(next.length - 1);
    if (!next.length) this.indexSig.set(-1);
    this.save();
  }
  // ── Selection & navigation ────────────────────────────────────────────────
  selectIndex(i: number): void {
    this.indexSig.set(this.clampIndex(i));
  }

  selectById(id: string): void {
    const i = this.itemsSig().findIndex(s => s.id === id);
    if (i >= 0) this.indexSig.set(i);
  }

  hasNext(): boolean     { return this.size() > 0 && this.indexSig() < this.size() - 1; }
  hasPrevious(): boolean { return this.size() > 0 && this.indexSig() > 0; }

  next(loop = true): Song | null {
    if (this.size() === 0) return null;
    const i = this.indexSig();
    const n = i + 1;
    if (n < this.size()) {
      this.indexSig.set(n);
    } else if (loop) {
      this.indexSig.set(0);
    } else {
      return null;
    }
    return this.current();
  }

  previous(loop = true): Song | null {
    if (this.size() === 0) return null;
    const i = this.indexSig();
    const p = i - 1;
    if (p >= 0) {
      this.indexSig.set(p);
    } else if (loop) {
      this.indexSig.set(this.size() - 1);
    } else {
      return null;
    }
    return this.current();
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  private clampIndex(i: number): number {
    const n = this.size();
    if (n === 0) return -1;
    return Math.max(0, Math.min(i, n - 1));
  }
}