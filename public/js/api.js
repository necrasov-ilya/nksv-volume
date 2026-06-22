import { getToken } from './config.js';

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  return res;
}

export const api = {
  async auth(password) {
    const res = await request('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    return res;
  },

  async upload(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
        else reject(new Error(xhr.statusText));
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  },

  async listFiles(folderId) {
    const params = folderId ? `?folderId=${folderId}` : '?folderId=null';
    const res = await request('/api/files' + params);
    if (!res.ok) throw new Error('Failed to load');
    return res.json();
  },

  async createFolder(name, folderId) {
    const res = await request('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name, folderId }),
    });
    return res.json();
  },

  async renameFolder(id, name) {
    const res = await request('/api/folders/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async deleteFile(id) {
    const res = await request('/api/files/' + id, { method: 'DELETE' });
    return res.ok;
  },

  async deleteFolder(id) {
    const res = await request('/api/folders/' + id, { method: 'DELETE' });
    return res.json();
  },

  async getMeta(id) {
    const res = await request('/api/meta/' + id);
    if (!res.ok) return null;
    return res.json();
  },
};
