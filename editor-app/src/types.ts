export type ArticleStatus = 'draft' | 'published';

export type Block = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Block[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type ArticleContent = {
  content: Block[];
};

export type ImageAsset = {
  id: string;
  filename: string;
  url: string;
};

export type ArticleDraft = {
  id: string;
  title: string;
  annotation: string;
  tags: string[];
  coverImage: string;
  status: ArticleStatus;
  content: Block;
};

export type ArticleResponse = {
  article: {
    id: string;
    type: 'article';
    title: string;
    annotation?: string;
    tags?: string[];
    coverImage?: string;
    status: ArticleStatus;
    folderId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  content: ArticleContent;
};