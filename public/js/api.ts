import type {
  AuthResponse, OkResponse, ServerConfig, FileListResponse,
  FolderListResponse, CreateFolderResponse, UploadResponse,
  ClientFileEntry, ClientFolderEntry,
} from './types.js';

let legacyToken: string | null = null;

interface ApiError extends Error {
  status: number;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = { ...options.headers } as Record<string, string>;
  if (legacyToken) headers.Authorization = `Bearer ${legacyToken}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    const error = new Error(payload.error || 'Не удалось выполнить запрос') as ApiError;
    error.status = response.status;
    if (response.status === 401 && !['/api/auth', '/api/auth/session'].includes(url)) {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    throw error;
  }

  return (response.status === 204 ? null : await response.json()) as T;
}

export const api = {
  async auth(password: string): Promise<AuthResponse> {
    const payload = await request<AuthResponse>('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (payload?.token) legacyToken = payload.token;
    return payload;
  },

  session(): Promise<OkResponse> {
    return request<OkResponse>('/api/auth/session');
  },

  async logout(): Promise<OkResponse> {
    try {
      return await request<OkResponse>('/api/auth/logout', { method: 'POST' });
    } finally {
      legacyToken = null;
    }
  },

  config(): Promise<ServerConfig> {
    return request<ServerConfig>('/api/config');
  },

  upload(formData: FormData, onProgress?: (percent: number) => void): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.withCredentials = true;
      if (legacyToken) xhr.setRequestHeader('Authorization', `Bearer ${legacyToken}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        let payload: UploadResponse = {} as UploadResponse;
        try { payload = JSON.parse(xhr.responseText || '{}'); } catch { /* no-op */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else {
          if (xhr.status === 401) window.dispatchEvent(new CustomEvent('session-expired'));
          const error = new Error((payload as { error?: string }).error || 'Не удалось загрузить файл') as ApiError;
          error.status = xhr.status;
          reject(error);
        }
      };
      xhr.onerror = () => reject(new Error('Нет соединения с сервером'));
      xhr.send(formData);
    });
  },

  listFiles(folderId: string | null): Promise<FileListResponse> {
    const value = folderId || 'null';
    return request<FileListResponse>(`/api/files?folderId=${encodeURIComponent(value)}`);
  },

  createFolder(name: string, folderId: string | null): Promise<CreateFolderResponse> {
    return request<CreateFolderResponse>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name, folderId }),
    });
  },

  listFolders(): Promise<FolderListResponse> {
    return request<FolderListResponse>('/api/folders');
  },

  moveFile(id: string, folderId: string | null): Promise<{ file: ClientFileEntry }> {
    return request(`/api/files/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    });
  },

  renameFile(id: string, name: string): Promise<{ file: ClientFileEntry }> {
    return request(`/api/files/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  renameFolder(id: string, name: string): Promise<{ folder: ClientFolderEntry }> {
    return request(`/api/folders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  deleteFile(id: string): Promise<OkResponse> {
    return request<OkResponse>(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  deleteFolder(id: string): Promise<OkResponse & { deleted: number }> {
    return request(`/api/folders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
