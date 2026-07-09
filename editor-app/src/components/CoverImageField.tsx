import { UploadCloud, X } from 'lucide-react';
import { useRef, type ChangeEvent, type DragEvent } from 'react';
import type { ImageAsset } from '../types.js';

type CoverImageFieldProps = {
  value: string;
  images: ImageAsset[];
  uploading: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
};

export function CoverImageField({
  value, images, uploading, onChange, onUpload,
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = images.find((image) => image.url === value);

  const handleFile = (file?: File) => {
    if (file) onUpload(file);
  };

  return (
    <div
      className={`admin-cover-field ${value ? 'admin-cover-field--filled' : ''}`}
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
          <span className="admin-cover-field__empty">16:9 · обложка статьи</span>
        )}
      </div>
      <div className="admin-cover-field__body">
        <span className="admin-cover-field__label">Обложка</span>
        <span className="admin-cover-field__hint">Показывается в начале публичной статьи</span>
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
            onClick={() => inputRef.current?.click()}
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
  );
}