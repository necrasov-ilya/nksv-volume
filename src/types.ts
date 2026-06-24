export interface FileEntry {
  id: string;
  type: 'file';
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  uploadedAt: string;
}

export interface FolderEntry {
  id: string;
  type: 'folder';
  name: string;
  folderId: string | null;
  createdAt: string;
}

export type MetaEntry = FileEntry | FolderEntry;
