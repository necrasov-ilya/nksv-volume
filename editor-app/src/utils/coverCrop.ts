import { COVER_HEIGHT, COVER_WIDTH } from '../constants/cover.js';

export type CoverCropTransform = {
  frameWidth: number;
  frameHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export function coverBaseScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function coverDisplaySize(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
): { width: number; height: number; scale: number } {
  const scale = coverBaseScale(imageWidth, imageHeight, frameWidth, frameHeight) * zoom;
  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
    scale,
  };
}

export function clampCoverOffset(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): { offsetX: number; offsetY: number } {
  const { width, height } = coverDisplaySize(imageWidth, imageHeight, frameWidth, frameHeight, zoom);
  const maxX = Math.max(0, (width - frameWidth) / 2);
  const maxY = Math.max(0, (height - frameHeight) / 2);
  return {
    offsetX: Math.min(maxX, Math.max(-maxX, offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, offsetY)),
  };
}

export async function renderCroppedCoverFile(
  image: HTMLImageElement,
  transform: CoverCropTransform,
  fileName: string,
): Promise<File> {
  const { frameWidth, frameHeight, zoom, offsetX, offsetY } = transform;
  const { width, height, scale } = coverDisplaySize(
    image.naturalWidth,
    image.naturalHeight,
    frameWidth,
    frameHeight,
    zoom,
  );

  const imgLeft = (frameWidth - width) / 2 + offsetX;
  const imgTop = (frameHeight - height) / 2 + offsetY;
  const srcX = -imgLeft / scale;
  const srcY = -imgTop / scale;
  const srcW = frameWidth / scale;
  const srcH = frameHeight / scale;

  const canvas = document.createElement('canvas');
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось подготовить обрезку');

  ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, COVER_WIDTH, COVER_HEIGHT);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
  if (!blob) throw new Error('Не удалось обрезать изображение');

  const base = fileName.replace(/\.[^.]+$/, '') || 'cover';
  return new File([blob], `${base}-cover.jpg`, { type: 'image/jpeg' });
}