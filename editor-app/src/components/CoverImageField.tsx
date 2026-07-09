import { UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { COVER_RATIO_LABEL, COVER_SIZE_LABEL } from '../constants/cover.js';
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
  const selected = images.find((image) => image.url === value);
  const [cropSource, setCropSource] = useState<CropSource | null>(null);

  useEffect(() => () => {
    if (cropSource) URL.revokeObjectURL(cropSource.url);
  }, [cropSource]);

  const closeCrop = () => {
    setCropSource((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const handleFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setCropSource((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { url, name: file.name };
    });
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
              aria-label={uploading ? 'Загрузка…' : 'Выбрать новую'}
              onClick={openFilePicker}
              disabled={uploading}
            >
              <UploadCloud size={20} strokeWidth={2.25} />
            </button>
            {value && (
              <button
                type="button"
                className="admin-cover-field__action"
                aria-label="Сбросить"
                onClick={() => onChange('')}
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>
        {compact && (
          <p className="admin-cover-field__spec">{coverSpec}</p>
        )}
        {!compact && (
          <div className="admin-cover-field__body">
            <span className="admin-cover-field__label">Обложка</span>
            <span className="admin-cover-field__hint">
              Показывается в начале публичной статьи · {coverSpec}
            </span>
            <span className="admin-cover-field__filename">
              {selected?.filename || (value ? 'Текущее изображение' : 'Не выбрано')}
            </span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
              <option value="">Выбрать из загрузок</option>
              {value && !selected && <option value={value}>Текущее изображение</option>}
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
                {uploading ? 'Загрузка…' : 'Загрузить'}
              </button>
              {value && (
                <button type="button" className="admin-button-ghost" onClick={() => onChange('')}>
                  <X size={15} />
                  Сбросить
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
          onCancel={closeCrop}
          onConfirm={(file) => {
            closeCrop();
            onUpload(file);
          }}
        />
      )}
    </>
  );
}