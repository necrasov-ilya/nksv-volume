import { CoverImageField } from './CoverImageField.js';
import type { ArticleDraft, ImageAsset } from '../types.js';

const statusLabel: Record<ArticleDraft['status'], string> = {
  published: 'Опубликована',
  draft: 'Черновик',
};

export function PublishPanel({ article, hasChanges }: { article: ArticleDraft; hasChanges: boolean }) {
  return (
    <section className="admin-bento-panel admin-publish-panel">
      <div className="admin-bento-panel__head">
        <h2>Публикация</h2>
        <span className={`admin-status admin-status--${article.status}`}>
          {statusLabel[article.status]}
        </span>
      </div>
      <div className="admin-publish-panel__rows">
        <span>ID</span>
        <strong>{article.id}</strong>
        <span>Состояние</span>
        <strong>{hasChanges ? 'Есть изменения' : 'Сохранено'}</strong>
      </div>
    </section>
  );
}

export function ArticleDetailsPanel({
  article,
  onTitle,
  onAnnotation,
  onTags,
}: {
  article: ArticleDraft;
  onTitle: (value: string) => void;
  onAnnotation: (value: string) => void;
  onTags: (value: string[]) => void;
}) {
  return (
    <section className="admin-bento-panel">
      <div className="admin-bento-panel__head">
        <h2>Паспорт</h2>
      </div>
      <div className="admin-field-grid">
        <label className="admin-field admin-field--full">
          <span>Заголовок</span>
          <input value={article.title} onChange={(event) => onTitle(event.target.value)} />
        </label>
        <label className="admin-field admin-field--full">
          <span>Аннотация</span>
          <textarea value={article.annotation} onChange={(event) => onAnnotation(event.target.value)} />
        </label>
        <label className="admin-field admin-field--full">
          <span>Теги</span>
          <input
            value={article.tags.join(', ')}
            onChange={(event) => onTags(
              event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
            )}
          />
        </label>
      </div>
    </section>
  );
}

export function CoverPanel({
  article,
  images,
  uploading,
  onCover,
  onUpload,
}: {
  article: ArticleDraft;
  images: ImageAsset[];
  uploading: boolean;
  onCover: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <section className="admin-bento-panel">
      <div className="admin-bento-panel__head">
        <h2>Обложка</h2>
      </div>
      <CoverImageField
        value={article.coverImage}
        images={images}
        uploading={uploading}
        onChange={onCover}
        onUpload={onUpload}
      />
    </section>
  );
}