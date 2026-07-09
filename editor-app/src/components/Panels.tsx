import { CoverImageField } from './CoverImageField.js';
import { TagsInput } from './TagsInput.js';
import { COVER_LABELS, STATE_LABELS, STATUS_LABELS } from '../constants/i18n.js';
import type { ArticleDraft, ImageAsset } from '../types.js';

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
          <h2>{COVER_LABELS.publish}</h2>
          <span className={`admin-status admin-status--${article.status}`}>
            {STATUS_LABELS[article.status]}
          </span>
        </div>
        <dl className="admin-inspector-meta">
          <div>
            <dt>{COVER_LABELS.id}</dt>
            <dd>{article.id}</dd>
          </div>
          <div>
            <dt>{COVER_LABELS.state}</dt>
            <dd>{hasChanges ? STATE_LABELS.hasChanges : STATE_LABELS.saved}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-inspector-section">
        <div className="admin-inspector-section__head">
          <h2>{COVER_LABELS.cover}</h2>
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
          <h2>{COVER_LABELS.passport}</h2>
        </div>
        <div className="admin-field-grid admin-field-grid--stack">
          <label className="admin-field admin-field--full">
            <span>{COVER_LABELS.title}</span>
            <input value={article.title} onChange={(event) => onTitle(event.target.value)} />
          </label>
          <label className="admin-field admin-field--full">
            <span>{COVER_LABELS.annotation}</span>
            <textarea
              rows={2}
              value={article.annotation}
              onChange={(event) => onAnnotation(event.target.value)}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>{COVER_LABELS.tags}</span>
            <TagsInput value={article.tags} placeholder={COVER_LABELS.tagsPlaceholder} onChange={onTags} />
          </label>
        </div>
      </section>
    </div>
  );
}