import fs from 'fs';
import type { Response } from 'express';

const RANGE_HEADER_PATTERN = /^bytes=(\d*)-(\d*)$/;

export interface ParsedRange {
  start: number;
  end: number;
}

export function parseRangeHeader(header: string | undefined, totalSize: number): ParsedRange | 'invalid' {
  if (!header) return { start: 0, end: totalSize - 1 };
  const match = RANGE_HEADER_PATTERN.exec(header);
  if (!match) return 'invalid';
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), totalSize - 1) : totalSize - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= totalSize) {
    return 'invalid';
  }
  return { start, end };
}

export interface RangeStreamOptions {
  filePath: string;
  totalSize: number;
  mimeType: string;
  originalName: string;
  rangeHeader: string | undefined;
}

export function streamWithRange(res: Response, options: RangeStreamOptions): void {
  res.setHeader('Content-Type', options.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename*=UTF-8''${encodeURIComponent(options.originalName)}`,
  );
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'");

  const parsed = parseRangeHeader(options.rangeHeader, options.totalSize);
  if (parsed === 'invalid') {
    res.setHeader('Content-Range', `bytes */${options.totalSize}`);
    res.status(416).end();
    return;
  }

  if (options.rangeHeader) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${parsed.start}-${parsed.end}/${options.totalSize}`);
    res.setHeader('Content-Length', parsed.end - parsed.start + 1);
    fs.createReadStream(options.filePath, { start: parsed.start, end: parsed.end }).pipe(res);
    return;
  }

  res.setHeader('Content-Length', options.totalSize);
  fs.createReadStream(options.filePath).pipe(res);
}
