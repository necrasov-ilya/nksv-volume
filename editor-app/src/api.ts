import {
  API_ARTICLE,
  API_ARTICLE_ASSETS_IMAGES,
  API_AUTH_SESSION,
  API_UPLOAD,
  PUBLIC_FILE_ROUTE,
} from './constants/api.js';
import { API_ERROR_MESSAGES } from './constants/i18n.js';
import type { ArticleContent, ArticleResponse, ImageAsset } from './types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = { ...options.headers } as Record<string, string>;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || API_ERROR_MESSAGES.requestFailed);
  }
  return await response.json() as T;
}

export async function session(): Promise<void> {
  await request(API_AUTH_SESSION);
}

export function getArticleId(): string {
  return new URLSearchParams(location.search).get('id') ?? '';
}

export function getArticle(id: string): Promise<ArticleResponse> {
  return request<ArticleResponse>(API_ARTICLE(id));
}

export function updateArticle(
  id: string,
  payload: {
    title?: string;
    annotation?: string;
    tags?: string[];
    coverImage?: string;
    status?: 'draft' | 'published';
    content?: ArticleContent;
  },
): Promise<ArticleResponse> {
  return request<ArticleResponse>(API_ARTICLE(id), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function listImages(): Promise<{ images: ImageAsset[] }> {
  return request(API_ARTICLE_ASSETS_IMAGES);
}

export function uploadImage(file: File): Promise<ImageAsset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('files', file);
    xhr.open('POST', API_UPLOAD);
    xhr.withCredentials = true;
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || '{}') as { files?: { id: string; originalName: string }[]; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && payload.files?.[0]) {
          const uploaded = payload.files[0];
          resolve({
            id: uploaded.id,
            filename: uploaded.originalName,
            url: PUBLIC_FILE_ROUTE(uploaded.id),
          });
          return;
        }
        reject(new Error(payload.error || API_ERROR_MESSAGES.imageUploadFailed));
      } catch {
        reject(new Error(API_ERROR_MESSAGES.imageUploadFailed));
      }
    };
    xhr.onerror = () => reject(new Error(API_ERROR_MESSAGES.noServerConnection));
    xhr.send(formData);
  });
}