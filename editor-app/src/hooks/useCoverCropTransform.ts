import { useCallback, useEffect, useRef, useState } from 'react';
import { clampCoverOffset } from '../utils/coverCrop.js';

interface FrameSize { width: number; height: number }
interface ImageSize { width: number; height: number }
interface Offset { x: number; y: number }

interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export interface UseCoverCropTransformOptions {
  imageUrl: string;
  frameRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseCoverCropTransformResult {
  ready: boolean;
  zoom: number;
  setZoom(value: number): void;
  offset: Offset;
  frameSize: FrameSize;
  imageSize: ImageSize;
  displayScale: number;
  displayWidth: number;
  displayHeight: number;
  imageLeft: number;
  imageTop: number;
  onImageLoad(naturalWidth: number, naturalHeight: number): void;
  onPointerDown(clientX: number, clientY: number): void;
  onPointerMove(clientX: number, clientY: number): void;
  onPointerEnd(): void;
  syncFrameSize(): void;
}

export function useCoverCropTransform({ imageUrl, frameRef }: UseCoverCropTransformOptions): UseCoverCropTransformResult {
  const [ready, setReady] = useState(false);
  const [zoom, setZoomState] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState<ImageSize>({ width: 0, height: 0 });
  const dragRef = useRef<DragState>({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

  const syncFrameSize = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
  }, [frameRef]);

  useEffect(() => {
    setZoomState(1);
    setOffset({ x: 0, y: 0 });
    setReady(false);
    setImageSize({ width: 0, height: 0 });
  }, [imageUrl]);

  const clamp = useCallback((nextX: number, nextY: number, nextZoom: number): Offset => {
    if (!imageSize.width || !frameSize.width) return { x: nextX, y: nextY };
    const result = clampCoverOffset(
      imageSize.width,
      imageSize.height,
      frameSize.width,
      frameSize.height,
      nextZoom,
      nextX,
      nextY,
    );
    return { x: result.offsetX, y: result.offsetY };
  }, [frameSize.height, frameSize.width, imageSize.height, imageSize.width]);

  const setZoom = useCallback((value: number) => {
    setZoomState(value);
    setOffset((current) => clamp(current.x, current.y, value));
  }, [clamp]);

  const onPointerDown = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  }, [offset.x, offset.y]);

  const onPointerMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current.active) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setOffset(clamp(dragRef.current.offsetX + dx, dragRef.current.offsetY + dy, zoom));
  }, [clamp, zoom]);

  const onPointerEnd = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const onImageLoad = useCallback((naturalWidth: number, naturalHeight: number) => {
    setImageSize({ width: naturalWidth, height: naturalHeight });
    setReady(true);
    syncFrameSize();
  }, [syncFrameSize]);

  const displayScale = frameSize.width && imageSize.width
    ? Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height) * zoom
    : 1;
  const displayWidth = imageSize.width * displayScale;
  const displayHeight = imageSize.height * displayScale;
  const imageLeft = (frameSize.width - displayWidth) / 2 + offset.x;
  const imageTop = (frameSize.height - displayHeight) / 2 + offset.y;

  return {
    ready,
    zoom,
    setZoom,
    offset,
    frameSize,
    imageSize,
    displayScale,
    displayWidth,
    displayHeight,
    imageLeft,
    imageTop,
    onImageLoad,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    syncFrameSize,
  };
}
