import { TipTapEditor } from '../editor/TipTapEditor.js';
import { EditorSidebarBody } from './Panels.js';
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
      <div className="admin-editor-pane">
        <TipTapEditor initialContent={article.content} onChange={onContentChange} />
      </div>
    </section>
  );
}

export function EditorInspector({
  article,
  hasChanges,
  images,
  uploadingCover,
  onTitle,
  onAnnotation,
  onTags,
  onCover,
  onUploadCover,
}: {
  article: ArticleDraft;
  hasChanges: boolean;
  images: ImageAsset[];
  uploadingCover: boolean;
  onTitle: (value: string) => void;
  onAnnotation: (value: string) => void;
  onTags: (value: string[]) => void;
  onCover: (value: string) => void;
  onUploadCover: (file: File) => void;
}) {
  return (
    <aside className="admin-editor-inspector">
      <EditorSidebarBody
        article={article}
        hasChanges={hasChanges}
        images={images}
        uploadingCover={uploadingCover}
        onTitle={onTitle}
        onAnnotation={onAnnotation}
        onTags={onTags}
        onCover={onCover}
        onUploadCover={onUploadCover}
      />
    </aside>
  );
}