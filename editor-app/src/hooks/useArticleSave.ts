import { useCallback, useState } from 'react';
import { updateArticle } from '../api.js';
import { ARTICLE_STATUSES, DEFAULT_ARTICLE_TITLE } from '../constants/article.js';
import { toDoc, toStorage } from '../utils/articleContent.js';
import type { ArticleDraft } from '../types.js';

export function useArticleSave(article: ArticleDraft | null) {
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (publish = false): Promise<ArticleDraft> => {
      if (!article) {
        throw new Error('No article');
      }

      setSaving(true);
      try {
        const result = await updateArticle(article.id, {
          title: article.title.trim() || DEFAULT_ARTICLE_TITLE,
          annotation: article.annotation.trim(),
          tags: article.tags,
          coverImage: article.coverImage,
          status: publish ? ARTICLE_STATUSES.published : ARTICLE_STATUSES.draft,
          content: toStorage(article.content),
        });

        return {
          id: result.article.id,
          title: result.article.title,
          annotation: result.article.annotation ?? '',
          tags: result.article.tags ?? [],
          coverImage: result.article.coverImage ?? '',
          status: result.article.status,
          content: toDoc(result.content),
        };
      } finally {
        setSaving(false);
      }
    },
    [article],
  );

  return { saving, save };
}
