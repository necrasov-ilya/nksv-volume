import { useEffect, useReducer } from 'react';
import { getArticle, listImages, session } from '../api.js';
import { APP_LABELS } from '../constants/i18n.js';
import { toDoc } from '../utils/articleContent.js';
import type { ArticleDraft, ImageAsset } from '../types.js';

type ArticleDraftState = {
  article: ArticleDraft | null;
  images: ImageAsset[];
  loading: boolean;
  error: string;
  hasChanges: boolean;
};

export type ArticleDraftAction =
  | { type: 'load'; article: ArticleDraft; images: ImageAsset[] }
  | { type: 'patch'; next: Partial<ArticleDraft> }
  | { type: 'setImages'; images: ImageAsset[] }
  | { type: 'setArticle'; article: ArticleDraft }
  | { type: 'setError'; error: string }
  | { type: 'clearError' };

function reducer(state: ArticleDraftState, action: ArticleDraftAction): ArticleDraftState {
  switch (action.type) {
    case 'load':
      return {
        ...state,
        article: action.article,
        images: action.images,
        loading: false,
        error: '',
        hasChanges: false,
      };
    case 'patch':
      return state.article
        ? { ...state, article: { ...state.article, ...action.next }, hasChanges: true }
        : state;
    case 'setImages':
      return { ...state, images: action.images };
    case 'setArticle':
      return { ...state, article: action.article, hasChanges: false, error: '' };
    case 'setError':
      return { ...state, error: action.error, loading: false };
    case 'clearError':
      return { ...state, error: '' };
    default:
      return state;
  }
}

const initialState: ArticleDraftState = {
  article: null,
  images: [],
  loading: true,
  error: '',
  hasChanges: false,
};

export function useArticleDraft(articleId: string) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!articleId) {
      dispatch({ type: 'setError', error: APP_LABELS.articleIdMissing });
      return;
    }

    let cancelled = false;

    Promise.all([session(), getArticle(articleId), listImages()])
      .then(([, payload, assets]) => {
        if (cancelled) return;
        dispatch({
          type: 'load',
          article: {
            id: payload.article.id,
            title: payload.article.title,
            annotation: payload.article.annotation ?? '',
            tags: payload.article.tags ?? [],
            coverImage: payload.article.coverImage ?? '',
            status: payload.article.status,
            content: toDoc(payload.content),
          },
          images: assets.images,
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        dispatch({ type: 'setError', error: err.message || APP_LABELS.articleLoadError });
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return { ...state, dispatch };
}
