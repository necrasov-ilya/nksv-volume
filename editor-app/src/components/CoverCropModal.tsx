import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { COVER_ASPECT, COVER_RATIO_LABEL, COVER_SIZE_LABEL } from '../constants/cover.js';
import { COVER_ZOOM_MAX, COVER_ZOOM_MIN, COVER_ZOOM_STEP } from '../constants/editor.js';
import { COVER_LABELS } from '../constants/i18n.js';
import { useCoverCropTransform } from '../hooks/useCoverCropTransform.js';
import { renderCroppedCoverFile } from '../utils/coverCrop.js';

type CoverCropModalProps = {
  imageUrl: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export function CoverCropModal({ imageUrl, fileName, onCancel, onConfirm }: CoverCropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [applying, setApplying] = useState(false);

  const transform = useCoverCropTransform({ imageUrl, frameRef });

  useEffect(() => {
    transform.syncFrameSize();
    const handleResize = () => transform.syncFrameSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [transform]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const applyCrop = useCallback(async () => {
    const image = imageRef.current;
    if (!image || !transform.frameSize.width) return;
    setApplying(true);
    try {
      const file = await renderCroppedCoverFile(
        image,
        {
          frameWidth: transform.frameSize.width,
          frameHeight: transform.frameSize.height,
          zoom: transform.zoom,
          offsetX: transform.offset.x,
          offsetY: transform.offset.y,
        },
        fileName,
      );
      onConfirm(file);
    } finally {
      setApplying(false);
    }
  }, [transform, fileName, onConfirm]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    transform.onPointerDown(event.clientX, event.clientY);
  }, [transform]);

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
            <h2 id="cover-crop-title">{COVER_LABELS.cropTitle}</h2>
            <p>
              {COVER_LABELS.cropDescription
                .replace('{ratio}', COVER_RATIO_LABEL)
                .replace('{size}', COVER_SIZE_LABEL)}
            </p>
          </div>
        </div>

        <CropCanvas
          frameRef={frameRef}
          imageRef={imageRef}
          imageUrl={imageUrl}
          ready={transform.ready}
          displayWidth={transform.displayWidth}
          displayHeight={transform.displayHeight}
          imageLeft={transform.imageLeft}
          imageTop={transform.imageTop}
          onPointerDown={onPointerDown}
          onPointerMove={(event) => transform.onPointerMove(event.clientX, event.clientY)}
          onPointerUp={transform.onPointerEnd}
          onPointerCancel={transform.onPointerEnd}
          onImageLoad={(event) => transform.onImageLoad(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
        />

        <label className="cover-crop-modal__zoom">
          <span>{COVER_LABELS.zoom}</span>
          <input
            type="range"
            min={COVER_ZOOM_MIN}
            max={COVER_ZOOM_MAX}
            step={COVER_ZOOM_STEP}
            value={transform.zoom}
            onChange={(event) => transform.setZoom(Number(event.target.value))}
          />
        </label>

        <div className="cover-crop-modal__actions">
          <button type="button" className="admin-button-ghost" onClick={onCancel} disabled={applying}>
            {COVER_LABELS.cancel}
          </button>
          <button
            type="button"
            className="admin-button-primary"
            onClick={() => { void applyCrop(); }}
            disabled={!transform.ready || applying}
          >
            {applying ? COVER_LABELS.applying : COVER_LABELS.applyCrop}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CropCanvasProps {
  frameRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  imageUrl: string;
  ready: boolean;
  displayWidth: number;
  displayHeight: number;
  imageLeft: number;
  imageTop: number;
  onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerUp(): void;
  onPointerCancel(): void;
  onImageLoad(event: React.SyntheticEvent<HTMLImageElement>): void;
}

function CropCanvas({
  frameRef, imageRef, imageUrl, ready, displayWidth, displayHeight, imageLeft, imageTop,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onImageLoad,
}: CropCanvasProps) {
  return (
    <div
      ref={frameRef}
      className="cover-crop-modal__frame"
      style={{ aspectRatio: String(COVER_ASPECT) }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
        onLoad={onImageLoad}
      />
      <div className="cover-crop-modal__mask" aria-hidden="true" />
    </div>
  );
}
