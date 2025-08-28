import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  // handles: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
  const rx = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/;
  const m = url.match(rx);
  return m?.[1] ?? null;
}


export type YouTubeEmbedOpts = {
  autoplay?: 0 | 1;
  controls?: 0 | 1;
  modestbranding?: 0 | 1;
  rel?: 0 | 1;
  enablejsapi?: 0 | 1;
};


export function buildYouTubeEmbedUrl(
  videoId?: string | null,
  {
    autoplay = 0,
    controls = 1,
    modestbranding = 1,
    rel = 0,
    enablejsapi = 1,
  }: YouTubeEmbedOpts = {}
): string {
  if (!videoId) return '';
  const origin =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=${enablejsapi}&origin=${origin}&autoplay=${autoplay}&controls=${controls}&modestbranding=${modestbranding}&rel=${rel}`;
}


