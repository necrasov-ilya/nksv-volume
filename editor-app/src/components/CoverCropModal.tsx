import { useCallback, useEffect, useRef, useState } from 'react';
import { COVER_ASPECT, COVER_RATIO_LABEL, COVER_SIZE_LABEL } from '../constants/cover.js';
import {
  clampCoverOffset,
  renderCroppedCoverFile,
} from '../utils/coverCrop.js';

type CoverCropModalProps = {
  imageUrl: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export function CoverCropModal({
  imageUrl, fileName, onCancel, onConfirm,
}: CoverCropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });

  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const syncFrameSize = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
  }, []);

  useEffect(() => {
    syncFrameSize();
    window.addEventListener('resize', syncFrameSize);
    return () => window.removeEventListener('resize', syncFrameSize);
  }, [syncFrameSize, ready]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setReady(false);
    setImageSize({ width: 0, height: 0 });
  }, [imageUrl]);

  const clampOffset = useCallback((nextX: number, nextY: number, nextZoom = zoom) => {
    if (!imageSize.width || !frameSize.width) return { x: nextX, y: nextY };
    const clamped = clampCoverOffset(
      imageSize.width,
      imageSize.height,
      frameSize.width,
      frameSize.height,
      nextZoom,
      nextX,
      nextY,
    );
    return { x: clamped.offsetX, y: clamped.offsetY };
  }, [frameSize.height, frameSize.width, imageSize.height, imageSize.width, zoom]);

  const handleZoom = (value: number) => {
    const clamped = clampOffset(offset.x, offset.y, value);
    setZoom(value);
    setOffset(clamped);
  };

  const startDrag = (clientX: number, clientY: number) => {
    dragRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragRef.current.active) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.offsetX + dx, dragRef.current.offsetY + dy));
  };

  const endDrag = () => {
    dragRef.current.active = false;
  };

  const applyCrop = async () => {
    const image = imageRef.current;
    if (!image || !frameSize.width) return;
    setApplying(true);
    try {
      const file = await renderCroppedCoverFile(image, {
        frameWidth: frameSize.width,
        frameHeight: frameSize.height,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
      }, fileName);
      onConfirm(file);
    } finally {
      setApplying(false);
    }
  };

  const displayScale = frameSize.width && imageSize.width
    ? Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height) * zoom
    : 1;
  const displayWidth = imageSize.width * displayScale;
  const displayHeight = imageSize.height * displayScale;
  const imageLeft = (frameSize.width - displayWidth) / 2 + offset.x;
  const imageTop = (frameSize.height - displayHeight) / 2 + offset.y;

  return (
    <div className="cover-crop-modal" role="presentation" onClick={onCancel}>
      <div
        className="cover-crop-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-crop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cover-crop-modal__head">
          <div>
            <h2 id="cover-crop-title">Обрезка обложки</h2>
            <p>
              Формат {COVER_RATIO_LABEL} · {COVER_SIZE_LABEL}. Перетащите и увеличьте фото, чтобы
              заполнить рамку.
            </p>
          </div>
        </div>

        <div
          ref={frameRef}
          className="cover-crop-modal__frame"
          style={{ aspectRatio: String(COVER_ASPECT) }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            startDrag(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => moveDrag(event.clientX, event.clientY)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt=""
            draggable={false}
            className="cover-crop-modal__image"
            style={ready ? {
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              transform: `translate(${imageLeft}px, ${imageTop}px)`,
            } : undefined}
            onLoad={(event) => {
              const target = event.currentTarget;
              setImageSize({ width: target.naturalWidth, height: target.naturalHeight });
              setReady(true);
              syncFrameSize();
            }}
          />
          <div className="cover-crop-modal__mask" aria-hidden="true" />
        </div>

        <label className="cover-crop-modal__zoom">
          <span>Масштаб</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => handleZoom(Number(event.target.value))}
          />
        </label>

        <div className="cover-crop-modal__actions">
          <button type="button" className="admin-button-ghost" onClick={onCancel} disabled={applying}>
            Отмена
          </button>
          <button
            type="button"
            className="admin-button-primary"
            onClick={() => { void applyCrop(); }}
            disabled={!ready || applying}
          >
            {applying ? 'Сохраняем…' : 'Применить обрезку'}
          </button>
        </div>
      </div>
    </div>
  );
}