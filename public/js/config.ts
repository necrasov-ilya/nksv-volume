const toastTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function getFolderId(): string | null {
  return sessionStorage.getItem('nksv_folder') || null;
}

export function setFolderId(id: string | null): void {
  if (id) sessionStorage.setItem('nksv_folder', id);
  else sessionStorage.removeItem('nksv_folder');
}

export function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimers.get(toast));
  toastTimers.set(toast, setTimeout(() => toast.classList.remove('show'), 2600));
}

export function escapeHtml(value: string = ''): string {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

export function formatSize(bytes: number = 0): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1).replace('.', ',')} КБ`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} МБ`;
  return `${(bytes / 1024 ** 3).toFixed(2).replace('.', ',')} ГБ`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `сегодня, ${time}`;
  return `${date.toLocaleDateString('ru-RU')} · ${time}`;
}

export { isImageMime as isImage, isVideoMime as isVideo, isPdfMime as isPdf } from './itemKind.js';
export { resolveItemIcon as fileIcon, resolveItemLabel as extensionLabel } from './itemKind.js';
