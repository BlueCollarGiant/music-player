
export interface Song {
  id: number;
  name: string;
  artist?: string;
  duration: string;
  video_url?: string;
  thumbnail_url?: string;
  isHeader?: boolean;
  isPlaceholder?: boolean;
}