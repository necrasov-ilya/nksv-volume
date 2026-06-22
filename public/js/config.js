export function getToken() {
  return localStorage.getItem('nksv_token');
}

export function setToken(token) {
  localStorage.setItem('nksv_token', token);
}

export function clearToken() {
  localStorage.removeItem('nksv_token');
}

export function getFolderId() {
  return sessionStorage.getItem('nksv_folder') || null;
}

export function setFolderId(id) {
  if (id) sessionStorage.setItem('nksv_folder', id);
  else sessionStorage.removeItem('nksv_folder');
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU') + ' ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function isImage(mime) { return mime?.startsWith('image/'); }
export function isVideo(mime) { return mime?.startsWith('video/'); }
