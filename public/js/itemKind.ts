import { strings } from './constants/i18n.js';
import type { ClientEntry } from './types.js';

export type ItemKind = 'folder' | 'image' | 'video' | 'pdf' | 'text' | 'article' | 'file';

export type ViewerKind = 'folder-list' | 'image' | 'video' | 'pdf' | 'text' | 'article' | 'generic';

function isImage(mime: string): boolean { return mime.startsWith('image/'); }
function isVideo(mime: string): boolean { return mime.startsWith('video/'); }
function isPdf(mime: string): boolean { return mime === 'application/pdf'; }
function isText(mime: string): boolean { return mime.startsWith('text/'); }

export function resolveItemKind(entry: ClientEntry): ItemKind {
  if (entry.type === 'folder') return 'folder';
  if (entry.type === 'article') return 'article';
  if (isVideo(entry.mimeType)) return 'video';
  if (isImage(entry.mimeType)) return 'image';
  if (isPdf(entry.mimeType)) return 'pdf';
  if (isText(entry.mimeType)) return 'text';
  return 'file';
}

export function resolveItemLabel(entry: ClientEntry): string {
  if (entry.type === 'folder') return strings.itemKinds.folder;
  if (entry.type === 'article') return strings.itemKinds.article;
  const name = entry.originalName || '';
  if (name.includes('.')) return (name.split('.').pop() ?? '').toUpperCase();
  return strings.itemKinds.file;
}

export function resolveItemIcon(entry: ClientEntry): string {
  switch (resolveItemKind(entry)) {
    case 'folder': return 'ti-folder';
    case 'article': return 'ti-article';
    case 'video': return 'ti-video';
    case 'image': return 'ti-photo';
    case 'pdf': return 'ti-file-type-pdf';
    case 'text': return 'ti-file-text';
    default: return 'ti-file';
  }
}

export function resolveViewer(entry: ClientEntry): ViewerKind {
  switch (resolveItemKind(entry)) {
    case 'folder': return 'folder-list';
    case 'article': return 'article';
    case 'image': return 'image';
    case 'video': return 'video';
    case 'pdf': return 'pdf';
    case 'text': return 'text';
    default: return 'generic';
  }
}

export function entryDisplayName(entry: ClientEntry): string {
  if (entry.type === 'folder') return entry.name;
  if (entry.type === 'article') return entry.title;
  return entry.originalName;
}

export function isImageMime(mime: string = ''): boolean { return isImage(mime); }
export function isVideoMime(mime: string = ''): boolean { return isVideo(mime); }
export function isPdfMime(mime: string = ''): boolean { return isPdf(mime); }