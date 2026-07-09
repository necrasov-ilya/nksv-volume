import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getArticle, getArticleId, listImages, session, updateArticle, uploadImage,
} from './api.js';
import { EditorActionPill } from './components/EditorActionPill.js';
import { EditorCanvas, EditorInspector } from './components/EditorLayout.js';
import { copyArticleShareLink } from './utils/share.js';
import type { ArticleContent, ArticleDraft, Block, ImageAsset } from './types.js';

const emptyContent: Block = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

function toDoc(content: ArticleContent): Block {
  const doc = content.content?.[0];
  if (doc?.type === 'doc') return doc;
  return emptyContent;
}

function toStorage(content: Block): ArticleContent {
  return { content: [content] };
}

function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

export function App() {
  const articleId = getArticleId();
  const [article, setArticle] = useState<ArticleDraft | null>(null);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    if (!articleId) {
      setError('Не указан id статьи');
      setLoading(false);
      return;
    }

    Promise.all([session(), getArticle(articleId), listImages()])
      .then(([, payload, assets]) => {
        setArticle({
          id: payload.article.id,
          title: payload.article.title,
          annotation: payload.article.annotation ?? '',
          tags: payload.article.tags ?? [],
          coverImage: payload.article.coverImage ?? '',
          status: payload.article.status,
          content: toDoc(payload.content),
        });
        setImages(assets.images);
        setHasChanges(false);
      })
      .catch((err: Error) => setError(err.message || 'Не удалось загрузить статью'))
      .finally(() => setLoading(false));
  }, [articleId]);

  const patch = (next: Partial<ArticleDraft>) => {
    setArticle((current) => (current ? { ...current, ...next } : current));
    setHasChanges(true);
  };

  const save = async (publish = false) => {
    if (!article) return;
    setSaving(true);
    setError('');
    try {
      const result = await updateArticle(article.id, {
        title: article.title.trim() || 'Без названия',
        annotation: article.annotation.trim(),
        tags: article.tags,
        coverImage: article.coverImage,
        status: publish ? 'published' : 'draft',
        content: toStorage(article.content),
      });
      setArticle({
        id: result.article.id,
        title: result.article.title,
        annotation: result.article.annotation ?? '',
        tags: result.article.tags ?? [],
        coverImage: result.article.coverImage ?? '',
        status: result.article.status,
        content: toDoc(result.content),
      });
      setHasChanges(false);
      showToast(publish ? 'Статья опубликована' : 'Сохранено');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    try {
      const uploaded = await uploadImage(file);
      setImages((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)]);
      patch({ coverImage: uploaded.url });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleBack = () => {
    if (hasChanges && !window.confirm('Выйти без сохранения?')) return;
    location.href = '/';
  };

  const copyShareLink = async () => {
    if (!article) return;
    const copied = await copyArticleShareLink(article.id);
    showToast(copied ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
  };

  if (loading) return <div className="admin-loading">Загрузка…</div>;
  if (!article) {
    return (
      <div className="admin-editor">
        <p className="admin-error">{error || 'Статья не найдена'}</p>
        <button type="button" className="admin-button-ghost" onClick={() => { location.href = '/'; }}>
          <ArrowLeft size={16} />
          К файлам
        </button>
      </div>
    );
  }

  return (
    <div className="admin-editor">
      <header className="admin-editor-topbar">
        <div className="admin-editor-topbar__main">
          <button type="button" className="admin-button-ghost" onClick={handleBack}>
            <ArrowLeft size={16} />
            К файлам
          </button>
          <span className="admin-editor-topbar__label">Редактирование статьи</span>
        </div>
        <EditorActionPill
          saving={saving}
          hasChanges={hasChanges}
          status={article.status}
          onSave={() => { void save(false); }}
          onPublish={() => { void save(true); }}
          onCopyLink={() => { void copyShareLink(); }}
        />
      </header>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-editor-layout">
        <EditorCanvas
          article={article}
          onContentChange={(content) => patch({ content })}
        />
        <EditorInspector
          article={article}
          hasChanges={hasChanges}
          images={images}
          uploadingCover={uploadingCover}
          onTitle={(title) => patch({ title })}
          onAnnotation={(annotation) => patch({ annotation })}
          onTags={(tags) => patch({ tags })}
          onCover={(coverImage) => patch({ coverImage })}
          onUploadCover={(file) => { void uploadCover(file); }}
        />
      </div>
    </div>
  );
}