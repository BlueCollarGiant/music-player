/**
 * Format seconds to a human-friendly time string.
 * < 1 hour  -> M:SS
 * >= 1 hour -> H:MM:SS (hours unpadded, minutes & seconds padded)
 */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Convenience for formatting from milliseconds (e.g., track.durationMs).
 */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null || isNaN(ms) || ms < 0) return '0:00';
  return formatTime(ms / 1000);
}
