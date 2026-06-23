export function getFolderId() {
  return sessionStorage.getItem('nksv_folder') || null;
}

export function setFolderId(id) {
  if (id) sessionStorage.setItem('nksv_folder', id);
  else sessionStorage.removeItem('nksv_folder');
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

export function escapeHtml(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

export function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1).replace('.', ',')} КБ`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} МБ`;
  return `${(bytes / 1024 ** 3).toFixed(2).replace('.', ',')} ГБ`;
}

export function formatDate(iso) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `сегодня, ${time}`;
  return `${date.toLocaleDateString('ru-RU')} · ${time}`;
}

export function isImage(mime = '') { return mime.startsWith('image/'); }
export function isVideo(mime = '') { return mime.startsWith('video/'); }
export function isPdf(mime = '') { return mime === 'application/pdf'; }

export function fileIcon(mime = '') {
  if (isVideo(mime)) return 'ti-video';
  if (isImage(mime)) return 'ti-photo';
  if (isPdf(mime)) return 'ti-file-type-pdf';
  return 'ti-file';
}

export function extensionLabel(item) {
  if (item.type === 'folder') return 'Папка';
  const name = item.originalName || '';
  return name.includes('.') ? name.split('.').pop().toUpperCase() : 'Файл';
}
