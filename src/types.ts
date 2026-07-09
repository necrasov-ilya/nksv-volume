export interface BaseEntry {
  id: string;
  folderId: string | null;
}

export interface FolderEntry extends BaseEntry {
  type: 'folder';
  name: string;
  createdAt: string;
}

export interface FileEntry extends BaseEntry {
  type: 'file';
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface ArticleEntry extends BaseEntry {
  type: 'article';
  title: string;
  annotation?: string;
  tags?: string[];
  coverImage?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export type MetaEntry = FolderEntry | FileEntry | ArticleEntry;

export interface BlockMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface Block {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Block[];
  text?: string;
  marks?: BlockMark[];
}

export interface ArticleContent {
  content: Block[];
}

export interface ArticleHeading {
  level: number;
  text: string;
  id: string;
}

export interface RenderedArticle {
  html: string;
  headings: ArticleHeading[];
}