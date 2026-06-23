let legacyToken = null;

async function request(url, options = {}) {
  const headers = { ...options.headers };
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
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || 'Не удалось выполнить запрос');
    error.status = response.status;
    if (response.status === 401 && !['/api/auth', '/api/auth/session'].includes(url)) {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

export const api = {
  async auth(password) {
    const payload = await request('/api/auth', { method: 'POST', body: JSON.stringify({ password }) });
    // Compatibility with an already-running pre-update dev server. The token is
    // intentionally kept in memory only and disappears on refresh.
    if (payload?.token) legacyToken = payload.token;
    return payload;
  },

  session() {
    return request('/api/auth/session');
  },

  async logout() {
    try {
      return await request('/api/auth/logout', { method: 'POST' });
    } finally {
      legacyToken = null;
    }
  },

  config() {
    return request('/api/config');
  },

  upload(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.withCredentials = true;
      if (legacyToken) xhr.setRequestHeader('Authorization', `Bearer ${legacyToken}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onload = () => {
        let payload = {};
        try { payload = JSON.parse(xhr.responseText || '{}'); } catch { /* no-op */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else {
          if (xhr.status === 401) window.dispatchEvent(new CustomEvent('session-expired'));
          const error = new Error(payload.error || 'Не удалось загрузить файл');
          error.status = xhr.status;
          reject(error);
        }
      };
      xhr.onerror = () => reject(new Error('Нет соединения с сервером'));
      xhr.send(formData);
    });
  },

  listFiles(folderId) {
    const value = folderId || 'null';
    return request(`/api/files?folderId=${encodeURIComponent(value)}`);
  },

  createFolder(name, folderId) {
    return request('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name, folderId }),
    });
  },

  listFolders() {
    return request('/api/folders');
  },

  moveFile(id, folderId) {
    return request(`/api/files/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    });
  },

  renameFile(id, name) {
    return request(`/api/files/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  renameFolder(id, name) {
    return request(`/api/folders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  deleteFile(id) {
    return request(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  deleteFolder(id) {
    return request(`/api/folders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
