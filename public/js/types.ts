export interface ClientFileEntry {
  id: string;
  type: 'file';
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  uploadedAt: string;
}

export interface ClientFolderEntry {
  id: string;
  type: 'folder';
  name: string;
  folderId: string | null;
  createdAt: string;
  itemCount?: number;
}

export interface ClientArticleEntry {
  id: string;
  type: 'article';
  title: string;
  annotation?: string;
  tags?: string[];
  coverImage?: string;
  status: 'draft' | 'published';
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClientEntry = ClientFileEntry | ClientFolderEntry | ClientArticleEntry;

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface ServerConfig {
  maxFileSizeMb: number;
  maxFilesPerUpload: number;
  maxStorageGb: number;
}

export interface FileListResponse {
  folders: (ClientFolderEntry & { itemCount: number })[];
  files: ClientFileEntry[];
  articles: ClientArticleEntry[];
  breadcrumbs: Breadcrumb[];
  storage: { usedBytes: number; limitBytes: number };
}

export interface FolderListResponse {
  folders: { id: string; name: string; folderId: string | null; path: string }[];
}

export interface CreateFolderResponse {
  folder: ClientFolderEntry;
}

export interface UploadResponse {
  files: ClientFileEntry[];
}

export interface OkResponse {
  ok: boolean;
}

export interface AuthResponse {
  ok?: boolean;
  token?: string;
}

export interface ShareFileResponse {
  type: 'file';
  item: ClientFileEntry;
}

export interface ShareFolderItem {
  id: string;
  type: 'folder';
  name: string;
  itemCount: number;
}

export interface ShareArticleItem {
  id: string;
  type: 'article';
  title: string;
  annotation?: string;
  coverImage?: string;
  updatedAt: string;
  html?: string;
  headings?: { level: number; text: string; id: string }[];
}

export interface ShareFolderResponse {
  type: 'folder';
  item: { id: string; type: 'folder'; name: string };
  items: (ClientFileEntry | ShareFolderItem | ShareArticleItem)[];
}

export interface ShareArticleResponse {
  type: 'article';
  item: ShareArticleItem & { html: string };
}

export type ShareResponse = ShareFileResponse | ShareFolderResponse | ShareArticleResponse;

export interface ArticleContent {
  content: Block[];
}

export interface Block {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Block[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface ArticleResponse {
  article: ClientArticleEntry;
  content: ArticleContent;
}

export interface CreateArticleResponse extends ArticleResponse {}