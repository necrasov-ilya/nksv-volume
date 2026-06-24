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

export type ClientEntry = ClientFileEntry | ClientFolderEntry;

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

export interface ShareFolderResponse {
  type: 'folder';
  item: { id: string; type: 'folder'; name: string };
  items: (ClientFileEntry | ShareFolderItem)[];
}

export type ShareResponse = ShareFileResponse | ShareFolderResponse;
