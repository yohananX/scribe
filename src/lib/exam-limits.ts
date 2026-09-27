export const EXAM_LIMITS = {
  maxPages: 10,
  maxFileBytes: 8 * 1024 * 1024,
  maxTotalBytes: 30 * 1024 * 1024,
  signedUrlExpirySeconds: 900,
} as const;

export function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
