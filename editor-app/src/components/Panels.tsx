import { CoverImageField } from './CoverImageField.js';
import type { ArticleDraft, ImageAsset } from '../types.js';

const statusLabel: Record<ArticleDraft['status'], string> = {
  published: 'Опубликована',
  draft: 'Черновик',
};

type EditorSidebarBodyProps = {
  article: ArticleDraft;
  hasChanges: boolean;
  images: ImageAsset[];
  uploadingCover: boolean;
  onTitle: (value: string) => void;
  onAnnotation: (value: string) => void;
  onTags: (value: string[]) => void;
  onCover: (value: string) => void;
  onUploadCover: (file: File) => void;
};

export function EditorSidebarBody({
  article,
  hasChanges,
  images,
  uploadingCover,
  onTitle,
  onAnnotation,
  onTags,
  onCover,
  onUploadCover,
}: EditorSidebarBodyProps) {
  return (
    <div className="admin-inspector-sidebar">
      <section className="admin-inspector-section">
        <div className="admin-inspector-section__head">
          <h2>Публикация</h2>
          <span className={`admin-status admin-status--${article.status}`}>
            {statusLabel[article.status]}
          </span>
        </div>
        <dl className="admin-inspector-meta">
          <div>
            <dt>ID</dt>
            <dd>{article.id}</dd>
          </div>
          <div>
            <dt>Состояние</dt>
            <dd>{hasChanges ? 'Есть изменения' : 'Сохранено'}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-inspector-section">
        <div className="admin-inspector-section__head">
          <h2>Обложка</h2>
        </div>
        <CoverImageField
          compact
          value={article.coverImage}
          images={images}
          uploading={uploadingCover}
          onChange={onCover}
          onUpload={onUploadCover}
        />
      </section>

      <section className="admin-inspector-section">
        <div className="admin-inspector-section__head">
          <h2>Паспорт</h2>
        </div>
        <div className="admin-field-grid admin-field-grid--stack">
          <label className="admin-field admin-field--full">
            <span>Заголовок</span>
            <input value={article.title} onChange={(event) => onTitle(event.target.value)} />
          </label>
          <label className="admin-field admin-field--full">
            <span>Аннотация</span>
            <textarea
              rows={2}
              value={article.annotation}
              onChange={(event) => onAnnotation(event.target.value)}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>Теги</span>
            <input
              value={article.tags.join(', ')}
              onChange={(event) => onTags(
                event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
              )}
              placeholder="через запятую"
            />
          </label>
        </div>
      </section>
    </div>
  );
}