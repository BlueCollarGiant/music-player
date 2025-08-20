import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match?.[1] ?? null;
}

export function hasYouTubeVideo(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export function getSafeVideoUrl(url: string, sanitizer: DomSanitizer): SafeResourceUrl {
  const videoId = getYouTubeId(url);
  if (!videoId) return sanitizer.bypassSecurityTrustResourceUrl('');
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1`;
  return sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
}

export function getVideoEmbedUrl(url: string, sanitizer: DomSanitizer): SafeResourceUrl | null {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${origin}&autoplay=1&controls=1&modestbranding=1&rel=0`;
  return sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
}
