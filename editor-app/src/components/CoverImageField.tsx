import { UploadCloud, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { COVER_RATIO_LABEL, COVER_SIZE_LABEL } from '../constants/cover.js';
import { COVER_LABELS } from '../constants/i18n.js';
import { useObjectURL } from '../hooks/useObjectURL.js';
import type { ImageAsset } from '../types.js';
import { CoverCropModal } from './CoverCropModal.js';

type CoverImageFieldProps = {
  value: string;
  images: ImageAsset[];
  uploading: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
};

type CropSource = {
  url: string;
  name: string;
};

export function CoverImageField({
  value, images, uploading, compact = false, onChange, onUpload,
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const cropSource = useCropSource(cropFile);
  const selected = images.find((image) => image.url === value);

  const handleFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setCropFile(file);
  };

  const openFilePicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  const coverSpec = `${COVER_RATIO_LABEL} · ${COVER_SIZE_LABEL}`;

  return (
    <>
      <div
        className={`admin-cover-field${compact ? ' admin-cover-field--compact' : ''}${value ? ' admin-cover-field--filled' : ''}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <div className="admin-cover-field__preview">
          {value ? (
            <img src={value} alt="" loading="lazy" />
          ) : (
            <span className="admin-cover-field__empty">{coverSpec}</span>
          )}
          <div className="admin-cover-field__overlay">
            <button
              type="button"
              className="admin-cover-field__action"
              aria-label={uploading ? COVER_LABELS.uploading : COVER_LABELS.chooseNew}
              onClick={openFilePicker}
              disabled={uploading}
            >
              <UploadCloud size={20} strokeWidth={2.25} />
            </button>
            {value && (
              <button
                type="button"
                className="admin-cover-field__action"
                aria-label={COVER_LABELS.reset}
                onClick={() => onChange('')}
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>
        {compact && <p className="admin-cover-field__spec">{coverSpec}</p>}
        {!compact && (
          <div className="admin-cover-field__body">
            <span className="admin-cover-field__label">{COVER_LABELS.cover}</span>
            <span className="admin-cover-field__hint">
              {COVER_LABELS.coverHint.replace('{spec}', coverSpec)}
            </span>
            <span className="admin-cover-field__filename">
              {selected?.filename || (value ? COVER_LABELS.currentImage : COVER_LABELS.notSelected)}
            </span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
              <option value="">{COVER_LABELS.selectFromUploads}</option>
              {value && !selected && <option value={value}>{COVER_LABELS.currentImage}</option>}
              {images.map((image) => (
                <option key={image.id} value={image.url}>{image.filename}</option>
              ))}
            </select>
            <div className="admin-cover-field__actions">
              <button
                type="button"
                className="admin-button-outline"
                onClick={openFilePicker}
                disabled={uploading}
              >
                <UploadCloud size={15} />
                {uploading ? COVER_LABELS.uploading : COVER_LABELS.upload}
              </button>
              {value && (
                <button type="button" className="admin-button-ghost" onClick={() => onChange('')}>
                  <X size={15} />
                  {COVER_LABELS.reset}
                </button>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      {cropSource && (
        <CoverCropModal
          imageUrl={cropSource.url}
          fileName={cropSource.name}
          onCancel={() => setCropFile(null)}
          onConfirm={(file) => {
            setCropFile(null);
            onUpload(file);
          }}
        />
      )}
    </>
  );
}

function useCropSource(file: File | null): CropSource | null {
  const url = useObjectURL(file);
  if (!file || !url) return null;
  return { url, name: file.name };
}
