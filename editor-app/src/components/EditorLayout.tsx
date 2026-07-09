import { TipTapEditor } from '../editor/TipTapEditor.js';
import { EditorActionPill } from './EditorActionPill.js';
import { ArticleDetailsPanel, CoverPanel, PublishPanel } from './Panels.js';
import type { ArticleDraft, Block, ImageAsset } from '../types.js';

export function EditorCanvas({
  article,
  onContentChange,
}: {
  article: ArticleDraft;
  onContentChange: (content: Block) => void;
}) {
  return (
    <section className="admin-editor-canvas">
      {article.coverImage && (
        <div className="article-cover-hero" aria-hidden="true">
          <img src={article.coverImage} alt="" />
        </div>
      )}
      <div className="admin-editor-pane">
        <TipTapEditor initialContent={article.content} onChange={onContentChange} />
      </div>
    </section>
  );
}

export function EditorInspector({
  article,
  hasChanges,
  saving,
  images,
  uploadingCover,
  onSave,
  onPublish,
  onCopyLink,
  onTitle,
  onAnnotation,
  onTags,
  onCover,
  onUploadCover,
}: {
  article: ArticleDraft;
  hasChanges: boolean;
  saving: boolean;
  images: ImageAsset[];
  uploadingCover: boolean;
  onSave: () => void;
  onPublish: () => void;
  onCopyLink: () => void;
  onTitle: (value: string) => void;
  onAnnotation: (value: string) => void;
  onTags: (value: string[]) => void;
  onCover: (value: string) => void;
  onUploadCover: (file: File) => void;
}) {
  return (
    <aside className="admin-editor-inspector">
      <EditorActionPill
        saving={saving}
        hasChanges={hasChanges}
        status={article.status}
        onSave={onSave}
        onPublish={onPublish}
        onCopyLink={onCopyLink}
      />
      <PublishPanel article={article} hasChanges={hasChanges} />
      <CoverPanel
        article={article}
        images={images}
        uploading={uploadingCover}
        onCover={onCover}
        onUpload={onUploadCover}
      />
      <ArticleDetailsPanel
        article={article}
        onTitle={onTitle}
        onAnnotation={onAnnotation}
        onTags={onTags}
      />
    </aside>
  );
}