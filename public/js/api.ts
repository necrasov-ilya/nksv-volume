import {
  API_ARTICLES,
  API_AUTH,
  API_AUTH_SESSION,
  API_CONFIG,
  API_FILES,
  API_FILES_LIST,
  API_FOLDERS,
  API_LOGOUT,
  API_UPLOAD,
} from './constants/routes.js';
import { strings } from './constants/i18n.js';
import { authHeader, emitSessionExpired, setLegacyToken } from './auth.js';
import type {
  ArticleResponse, AuthResponse, ClientFileEntry, ClientFolderEntry,
  CreateArticleResponse, CreateFolderResponse, FileListResponse, FolderListResponse,
  OkResponse, ServerConfig, UploadResponse,
} from './types.js';

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function buildHeaders(options: RequestInit): Headers {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  for (const [key, value] of Object.entries(authHeader())) {
    headers.set(key, value);
  }
  return headers;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return null as T;
  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

async function parseErrorPayload(response: Response): Promise<{ error?: string } | null> {
  try {
    return await parseJson<{ error?: string }>(response);
  } catch {
    return null;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const message = payload?.error || strings.auth.defaultError;
    if (response.status === 401) emitSessionExpired();
    throw new ApiError(message, response.status);
  }

  return parseJson<T>(response);
}

interface LegacyAuthPayload {
  token?: string;
  ok?: boolean;
}

function isLegacyAuthPayload(value: unknown): value is LegacyAuthPayload {
  return !!value && typeof value === 'object';
}

export const api = {
  auth(password: string): Promise<AuthResponse> {
    return request<AuthResponse>(API_AUTH, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }).then((response) => {
      if (isLegacyAuthPayload(response) && typeof response.token === 'string') {
        setLegacyToken(response.token);
      }
      return response;
    });
  },

  session(): Promise<OkResponse> {
    return request<OkResponse>(API_AUTH_SESSION);
  },

  logout(): Promise<OkResponse> {
    return request<OkResponse>(API_LOGOUT, { method: 'POST' }).finally(() => {
      setLegacyToken(null);
    });
  },

  config(): Promise<ServerConfig> {
    return request<ServerConfig>(API_CONFIG);
  },

  upload(formData: FormData, onProgress?: (percent: number) => void): Promise<UploadResponse> {
    return new Promise<UploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_UPLOAD);
      xhr.withCredentials = true;
      for (const [key, value] of Object.entries(authHeader())) {
        xhr.setRequestHeader(key, value);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        let payload: UploadResponse = {} as UploadResponse;
        try { payload = JSON.parse(xhr.responseText || '{}'); } catch { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload);
        } else {
          if (xhr.status === 401) emitSessionExpired();
          const message = (payload as { error?: string }).error || strings.auth.uploadFailed;
          reject(new ApiError(message, xhr.status));
        }
      };

      xhr.onerror = () => reject(new ApiError(strings.auth.connectionError, 0));
      xhr.send(formData);
    });
  },

  listFiles(folderId: string | null): Promise<FileListResponse> {
    return request<FileListResponse>(API_FILES_LIST(folderId));
  },

  createFolder(name: string, folderId: string | null): Promise<CreateFolderResponse> {
    return request<CreateFolderResponse>(API_FOLDERS(), {
      method: 'POST',
      body: JSON.stringify({ name, folderId }),
    });
  },

  listFolders(): Promise<FolderListResponse> {
    return request<FolderListResponse>(API_FOLDERS());
  },

  moveFile(id: string, folderId: string | null): Promise<{ file: ClientFileEntry }> {
    return request(API_FILES(id), {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    });
  },

  renameFile(id: string, name: string): Promise<{ file: ClientFileEntry }> {
    return request(API_FILES(id), {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  renameFolder(id: string, name: string): Promise<{ folder: ClientFolderEntry }> {
    return request(API_FOLDERS(id), {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  deleteFile(id: string): Promise<OkResponse> {
    return request<OkResponse>(API_FILES(id), { method: 'DELETE' });
  },

  deleteFolder(id: string): Promise<OkResponse & { deleted: number }> {
    return request(API_FOLDERS(id), { method: 'DELETE' });
  },

  createArticle(folderId: string | null, title = strings.admin.defaultArticleTitle): Promise<CreateArticleResponse> {
    return request<CreateArticleResponse>(API_ARTICLES(), {
      method: 'POST',
      body: JSON.stringify({ title, folderId }),
    });
  },

  getArticle(id: string): Promise<ArticleResponse> {
    return request<ArticleResponse>(API_ARTICLES(id));
  },

  updateArticle(id: string, payload: Record<string, unknown>): Promise<ArticleResponse> {
    return request<ArticleResponse>(API_ARTICLES(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteArticle(id: string): Promise<OkResponse> {
    return request<OkResponse>(API_ARTICLES(id), { method: 'DELETE' });
  },
};
