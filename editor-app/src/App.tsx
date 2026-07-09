import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  getArticle, getArticleId, listImages, session, updateArticle, uploadImage,
} from './api.js';
import { EDITOR_HOME } from './constants/api.js';
import { ARTICLE_STATUSES, DEFAULT_ARTICLE_TITLE } from './constants/article.js';
import { APP_LABELS, APP_TOASTS } from './constants/i18n.js';
import { EditorActionPill } from './components/EditorActionPill.js';
import { EditorCanvas, EditorInspector } from './components/EditorLayout.js';
import { useToast } from './hooks/useToast.js';
import { ensureDocContent } from './utils/articleContent.js';
import { copyArticleShareLink } from './utils/share.js';
import type { ArticleDraft, ArticleStatus, Block, ImageAsset } from './types.js';

type DraftAction =
  | { type: 'load'; draft: ArticleDraft }
  | { type: 'patch'; patch: Partial<ArticleDraft> }
  | { type: 'reset'; draft: ArticleDraft };

function draftReducer(state: ArticleDraft | null, action: DraftAction): ArticleDraft | null {
  switch (action.type) {
    case 'load':
    case 'reset':
      return action.draft;
    case 'patch':
      if (!state) return state;
      return { ...state, ...action.patch };
    default:
      return state;
  }
}

function toDraft(payload: Awaited<ReturnType<typeof getArticle>>): ArticleDraft {
  return {
    id: payload.article.id,
    title: payload.article.title,
    annotation: payload.article.annotation ?? '',
    tags: payload.article.tags ?? [],
    coverImage: payload.article.coverImage ?? '',
    status: payload.article.status,
    content: ensureDocContent(payload.content),
  };
}

function toStoragePayload(article: ArticleDraft, publish: boolean) {
  return {
    title: article.title.trim() || DEFAULT_ARTICLE_TITLE,
    annotation: article.annotation.trim(),
    tags: article.tags,
    coverImage: article.coverImage,
    status: publish ? ARTICLE_STATUSES.published : ARTICLE_STATUSES.draft,
    content: { content: [article.content as Block] },
  };
}

export function App() {
  const articleId = getArticleId();
  const [article, dispatch] = useReducer(draftReducer, null as ArticleDraft | null);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!hasChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    if (!articleId) {
      setError(APP_LABELS.articleIdMissing);
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([session(), getArticle(articleId), listImages()])
      .then(([, payload, assets]) => {
        if (cancelled) return;
        dispatch({ type: 'load', draft: toDraft(payload) });
        setImages(assets.images);
        setHasChanges(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || APP_LABELS.articleLoadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [articleId]);

  const patch = useCallback((next: Partial<ArticleDraft>) => {
    dispatch({ type: 'patch', patch: next });
    setHasChanges(true);
  }, []);

  const save = useCallback(async (publish: boolean) => {
    if (!article) return;
    setSaving(true);
    setError('');
    try {
      const result = await updateArticle(article.id, toStoragePayload(article, publish));
      dispatch({ type: 'reset', draft: toDraft(result) });
      setHasChanges(false);
      toast(publish ? APP_TOASTS.published : APP_TOASTS.saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [article, toast]);

  const uploadCover = useCallback(async (file: File) => {
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
  }, [patch]);

  const handleBack = useCallback(() => {
    if (hasChanges && !window.confirm(APP_LABELS.saveConfirmLeave)) return;
    location.href = EDITOR_HOME;
  }, [hasChanges]);

  const copyShareLink = useCallback(async () => {
    if (!article) return;
    const copied = await copyArticleShareLink(article.id);
    toast(copied ? APP_TOASTS.linkCopied : APP_TOASTS.linkCopyFailed);
  }, [article, toast]);

  const view = useMemo(() => {
    if (loading) return <div className="admin-loading">{APP_LABELS.loading}</div>;
    if (!article) {
      return (
        <div className="admin-editor">
          <p className="admin-error">{error || APP_LABELS.articleNotFound}</p>
          <button type="button" className="admin-button-ghost" onClick={() => { location.href = EDITOR_HOME; }}>
            <ArrowLeft size={16} />
            {APP_LABELS.backToFiles}
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
              {APP_LABELS.backToFiles}
            </button>
            <span className="admin-editor-topbar__label">{APP_LABELS.editArticle}</span>
          </div>
          <EditorActionPill
            saving={saving}
            hasChanges={hasChanges}
            status={article.status as ArticleStatus}
            onSave={() => { void save(false); }}
            onPublish={() => { void save(true); }}
            onCopyLink={() => { void copyShareLink(); }}
          />
        </header>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-editor-layout">
          <EditorCanvas article={article} onContentChange={(content) => patch({ content })} />
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
  }, [loading, article, error, handleBack, saving, hasChanges, save, copyShareLink, patch, images, uploadingCover, uploadCover]);

  return view;
}
