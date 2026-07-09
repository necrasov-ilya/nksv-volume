export const API_AUTH = '/api/auth' as const;
export const API_AUTH_SESSION = '/api/auth/session' as const;
export const API_LOGOUT = '/api/auth/logout' as const;
export const API_UPLOAD = '/api/upload' as const;
export const API_CONFIG = '/api/config' as const;
export const HOME_ROUTE = '/' as const;

export function API_FILES(id?: string): string {
  return id !== undefined ? `/api/files/${encodeURIComponent(id)}` : '/api/files';
}

export function API_FILES_LIST(folderId: string | null): string {
  return `${API_FILES()}?folderId=${encodeURIComponent(folderId ?? 'null')}`;
}

export function API_FOLDERS(id?: string): string {
  return id !== undefined ? `/api/folders/${encodeURIComponent(id)}` : '/api/folders';
}

export function API_ARTICLES(id?: string): string {
  return id !== undefined ? `/api/articles/${encodeURIComponent(id)}` : '/api/articles';
}

export function API_SHARE(id: string): string {
  return `/api/share/${encodeURIComponent(id)}`;
}

export function API_META(id: string): string {
  return `/api/meta/${encodeURIComponent(id)}`;
}

export function PUBLIC_FILE_ROUTE(id: string): string {
  return `/r/${encodeURIComponent(id)}`;
}

export function PUBLIC_VIEW_ROUTE(id: string): string {
  return `/v/${encodeURIComponent(id)}`;
}

export function EDITOR_ROUTE(id: string): string {
  return `/editor?id=${encodeURIComponent(id)}`;
}
