import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function writeJsonAtomically(filePath: string, value: unknown): void {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );

  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), 'utf-8');
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}
