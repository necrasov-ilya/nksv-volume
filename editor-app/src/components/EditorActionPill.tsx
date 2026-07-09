import { Link2, Send } from 'lucide-react';
import type { ArticleStatus } from '../types.js';

type EditorActionPillProps = {
  saving: boolean;
  hasChanges: boolean;
  status: ArticleStatus;
  onSave: () => void;
  onPublish: () => void;
  onCopyLink: () => void;
};

export function EditorActionPill({
  saving,
  hasChanges,
  status,
  onSave,
  onPublish,
  onCopyLink,
}: EditorActionPillProps) {
  const allGood = !hasChanges && !saving && status === 'published';
  const publishReady = !hasChanges && !saving && status === 'draft';

  if (allGood) {
    return (
      <div className="admin-action-pill admin-action-pill--all-good" role="status">
        <span className="admin-action-pill__good-label">Всё хорошо :)</span>
        <button
          type="button"
          className="admin-action-pill__segment admin-action-pill__segment--copy"
          onClick={onCopyLink}
        >
          <Link2 size={15} strokeWidth={2.25} />
          Ссылка
        </button>
      </div>
    );
  }

  return (
    <div
      className={`admin-action-pill${publishReady ? ' admin-action-pill--publish-ready' : ''}${hasChanges ? ' admin-action-pill--has-changes' : ''}`}
      role="group"
      aria-label="Действия со статьёй"
    >
      <button
        type="button"
        className="admin-action-pill__segment admin-action-pill__segment--save"
        disabled={saving || !hasChanges}
        onClick={onSave}
      >
        Сохранить
      </button>
      <button
        type="button"
        className="admin-action-pill__segment admin-action-pill__segment--publish"
        disabled={saving || hasChanges}
        onClick={onPublish}
      >
        <Send size={15} strokeWidth={2.25} />
        Опубликовать
      </button>
    </div>
  );
}