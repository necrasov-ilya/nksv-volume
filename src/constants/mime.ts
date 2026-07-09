export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
] as const;

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const PDF_MIME_TYPE = 'application/pdf' as const;

export const TEXT_MIME_TYPES = [
  'text/plain',
] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  ...VIDEO_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  PDF_MIME_TYPE,
] as const;
