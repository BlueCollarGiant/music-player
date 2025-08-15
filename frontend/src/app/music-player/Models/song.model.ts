
export interface Song {
  id: string;
  name: string;
  artist?: string;
  duration: string;
  video_url?: string;
  thumbnail_url?: string;
  // Extended cross-platform metadata
  platform?: 'youtube' | 'spotify' | 'soundcloud' | 'local';
  durationMs?: number | null;
  previewUrl?: string | null;
  externalUrl?: string | null;
  thumbnailUrl?: string; // alias to support unified accessor
  isHeader?: boolean;
  isPlaceholder?: boolean;
}