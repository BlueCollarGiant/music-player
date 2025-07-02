export interface Song {
  id: number;
  name: string;
  artist?: string;
  duration: string;
  isHeader?: boolean;
  isPlaceholder?: boolean;
}
