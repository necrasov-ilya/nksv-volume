export const API_PREFIX = '/api';

export const AUTH_ROUTE = '/auth';
export const AUTH_SESSION_ROUTE = '/auth/session';
export const AUTH_LOGOUT_ROUTE = '/auth/logout';

export const UPLOAD_ROUTE = '/upload';
export const FILES_ROUTE = '/files';
export const FOLDERS_ROUTE = '/folders';

export const ARTICLES_ROUTE = '/articles';
export const ARTICLE_IMAGES_ROUTE = '/articles/assets/images';

export const PUBLIC_FILE_ROUTE_PREFIX = '/r';
export const PUBLIC_FILE_ID_ROUTE = `${PUBLIC_FILE_ROUTE_PREFIX}/:id`;

export const PUBLIC_VIEWER_ROUTE_PREFIX = '/v';
export const PUBLIC_VIEWER_ID_ROUTE = `${PUBLIC_VIEWER_ROUTE_PREFIX}/:id`;

export const SHARE_ROUTE = '/share';
export const PUBLIC_SHARE_ROUTE = `${API_PREFIX}${SHARE_ROUTE}/:id`;

export const PUBLIC_CONFIG_ROUTE = `${API_PREFIX}/config`;
export const PUBLIC_META_ROUTE = `${API_PREFIX}/meta/:id`;

export const EDITOR_ROUTE = '/editor';
