export const API_AUTH_SESSION = '/api/auth/session';
export const API_ARTICLES = '/api/articles';
export const API_ARTICLE = (id: string): string => `${API_ARTICLES}/${encodeURIComponent(id)}`;
export const API_ARTICLE_ASSETS_IMAGES = '/api/articles/assets/images';
export const API_UPLOAD = '/api/upload';

export const PUBLIC_FILE_ROUTE = (id: string): string => `/r/${id}`;
export const SHARE_ROUTE = (id: string): string => `/v/${id}`;
export const EDITOR_HOME = '/';
