
export interface Song {
  id: string;
  name: string;
  artist?: string;
  duration: string;
  video_url?: string;
  thumbnail_url?: string;
  isHeader?: boolean;
  isPlaceholder?: boolean;
}