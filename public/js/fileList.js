import { api } from './api.js';
import {
  escapeHtml, extensionLabel, fileIcon, formatDate, formatSize,
  getFolderId, isImage, isPdf, isVideo, setFolderId, showToast,
} from './config.js';

let navigateCallback = null;
let currentItems = new Map();
let selectedId = null;
let movingItem = null;

function itemCountLabel(count = 0) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} объект`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${count} объекта`;
  return `${count} объектов`;
}

function shareUrl(id) {
  return `${location.origin}/v/${id}`;
}

async function copyText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    button?.classList.add('copied');
    const icon = button?.querySelector('.ti');
    const originalHtml = button?.innerHTML;
    if (button?.id === 'detail-copy') {
      button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>Скопировано';
    } else if (icon) {
      icon.className = 'ti ti-check';
    } else if (button) {
      button.textContent = 'Скопировано';
    }
    setTimeout(() => {
      if (button && originalHtml) button.innerHTML = originalHtml;
      button?.classList.remove('copied');
    }, 1600);
    showToast('Ссылка скопирована');
  } catch {
    window.prompt('Скопируйте ссылку:', value);
  }
}

function renderBreadcrumbs(crumbs) {
  const breadcrumbs = document.getElementById('breadcrumbs');
  const parentId = crumbs.length > 1 ? crumbs[crumbs.length - 2].id : '';
  const parts = [];
  if (crumbs.length) {
    parts.push(`
      <button class="crumb-up" type="button" data-folder-id="${escapeHtml(parentId)}" aria-label="На уровень выше">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
        Назад
      </button>`);
  }
  parts.push(`<button class="crumb" type="button" data-folder-id="">Все файлы</button>`);
  crumbs.forEach((crumb) => {
    parts.push('<span class="crumb-separator" aria-hidden="true">/</span>');
    parts.push(`<button class="crumb" type="button" data-folder-id="${escapeHtml(crumb.id)}">${escapeHtml(crumb.name)}</button>`);
  });
  breadcrumbs.innerHTML = parts.join('');
  const buttons = breadcrumbs.querySelectorAll('.crumb');
  buttons[buttons.length - 1]?.setAttribute('aria-current', 'page');
}

function visualFor(item) {
  if (item.type === 'folder') {
    return '<div class="item-visual"><i class="ti ti-folder" aria-hidden="true"></i></div>';
  }
  if (isImage(item.mimeType)) {
    return `<div class="item-visual media"><img src="/r/${escapeHtml(item.id)}" alt="" loading="lazy"></div>`;
  }
  if (isVideo(item.mimeType)) {
    return `<div class="item-visual media"><video src="/r/${escapeHtml(item.id)}#t=0.1" muted preload="metadata" aria-hidden="true"></video></div>`;
  }
  return `<div class="item-visual"><i class="ti ${fileIcon(item.mimeType)}" aria-hidden="true"></i></div>`;
}

function menuFor(item) {
  const openLabel = item.type === 'folder' ? 'Открыть папку' : 'Открыть файл';
  const move = item.type === 'folder'
    ? ''
    : `<button type="button" data-action="move"><i class="ti ti-folder-symlink" aria-hidden="true"></i>Переместить</button>`;
  const renameFile = item.type === 'folder'
    ? ''
    : `<button type="button" data-action="rename-file"><i class="ti ti-pencil" aria-hidden="true"></i>Переименовать</button>`;
  const rename = item.type === 'folder'
    ? `<button type="button" data-action="rename"><i class="ti ti-pencil" aria-hidden="true"></i>Переименовать</button>`
    : '';
  return `
    <details class="row-menu">
      <summary class="row-action" aria-label="Другие действия"><i class="ti ti-dots-vertical" aria-hidden="true"></i></summary>
      <div class="row-menu-popover">
        <button type="button" data-action="open"><i class="ti ti-external-link" aria-hidden="true"></i>${openLabel}</button>
        ${move}
        ${renameFile}
        ${rename}
        <button class="danger" type="button" data-action="delete"><i class="ti ti-trash" aria-hidden="true"></i>Удалить</button>
      </div>
    </details>`;
}

async function openMoveDialog(item) {
  try {
    const data = await api.listFolders();
    movingItem = item;
    document.getElementById('move-file-name').textContent = item.originalName;
    const select = document.getElementById('move-target');
    select.innerHTML = [
      '<option value="">Все файлы</option>',
      ...data.folders.map((folder) =>
        `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.path)}</option>`),
    ].join('');
    select.value = item.folderId || '';
    document.getElementById('move-dialog').showModal();
    requestAnimationFrame(() => select.focus());
  } catch (error) {
    showToast(error.message);
  }
}

function closeMoveDialog() {
  document.getElementById('move-dialog').close();
  movingItem = null;
}

async function submitMove(event) {
  event.preventDefault();
  if (!movingItem) return;
  const targetFolderId = document.getElementById('move-target').value || null;
  if ((movingItem.folderId || null) === targetFolderId) {
    closeMoveDialog();
    showToast('Файл уже находится в этой папке');
    return;
  }

  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await api.moveFile(movingItem.id, targetFolderId);
    closeMoveDialog();
    selectedId = null;
    showToast('Файл перемещён');
    await loadFiles();
  } catch (error) {
    showToast(error.message);
  } finally {
    submit.disabled = false;
  }
}

function renderRows(folders, files) {
  const list = document.getElementById('file-list');
  const items = [...folders, ...files];
  currentItems = new Map(items.map((item) => [item.id, item]));

  if (!items.length) {
    selectedId = null;
    renderDetail(null);
    list.innerHTML = `
      <div class="empty-list">
        <i class="ti ti-folder-open" aria-hidden="true"></i>
        Здесь пока пусто
      </div>`;
    return;
  }

  if (!currentItems.has(selectedId)) {
    selectedId = files[0]?.id || folders[0]?.id || null;
  }

  list.innerHTML = items.map((item) => {
    const isFolder = item.type === 'folder';
    const name = isFolder ? item.name : item.originalName;
    const meta = isFolder
      ? itemCountLabel(item.itemCount)
      : `${formatSize(item.size)} · ${formatDate(item.uploadedAt)}`;
    return `
      <article class="file-row${item.id === selectedId ? ' selected' : ''}" data-id="${escapeHtml(item.id)}" data-type="${item.type}">
        ${visualFor(item)}
        <div class="item-copy">
          ${isFolder
            ? `<button class="item-name" type="button" data-action="navigate">${escapeHtml(name)}</button>`
            : `<button class="item-name" type="button" data-action="select">${escapeHtml(name)}</button>`}
          <p class="item-meta">${escapeHtml(meta)}</p>
        </div>
        <button class="row-action" type="button" data-action="copy" aria-label="Скопировать публичную ссылку">
          <i class="ti ti-copy" aria-hidden="true"></i>
        </button>
        ${menuFor(item)}
      </article>`;
  }).join('');

  renderDetail(currentItems.get(selectedId));
}

function previewFor(item) {
  if (item.type === 'folder') return '<i class="ti ti-folder" aria-hidden="true"></i>';
  const raw = `/r/${encodeURIComponent(item.id)}`;
  if (isImage(item.mimeType)) return `<img src="${raw}" alt="${escapeHtml(item.originalName)}">`;
  if (isVideo(item.mimeType)) return `<video src="${raw}" controls preload="metadata"></video>`;
  if (isPdf(item.mimeType)) return `<iframe src="${raw}" title="${escapeHtml(item.originalName)}"></iframe>`;
  return `<i class="ti ${fileIcon(item.mimeType)}" aria-hidden="true"></i>`;
}

function renderDetail(item) {
  const panel = document.getElementById('detail-panel');
  if (!item) {
    panel.innerHTML = `
      <div class="detail-empty">
        <i class="ti ti-file" aria-hidden="true"></i>
        <p>Выберите файл, чтобы посмотреть его и скопировать ссылку.</p>
      </div>`;
    return;
  }

  const isFolder = item.type === 'folder';
  const name = isFolder ? item.name : item.originalName;
  const meta = isFolder
    ? itemCountLabel(item.itemCount)
    : `${formatSize(item.size)} · ${extensionLabel(item)}`;
  const url = shareUrl(item.id);
  panel.innerHTML = `
    <h2 class="detail-title" title="${escapeHtml(name)}">${escapeHtml(name)}</h2>
    <div class="detail-preview">${previewFor(item)}</div>
    <p class="detail-meta">${escapeHtml(meta)}</p>
    <div class="share-block">
      <label class="share-label" for="detail-share-url">Публичная ссылка</label>
      <div class="share-control">
        <input id="detail-share-url" value="${escapeHtml(url)}" readonly>
      </div>
    </div>
    <div class="detail-actions">
      <button class="primary-button" id="detail-copy" type="button">
        <i class="ti ti-copy" aria-hidden="true"></i>
        Скопировать ссылку
      </button>
      <a class="detail-open" href="/v/${encodeURIComponent(item.id)}" target="_blank" rel="noopener">
        <i class="ti ti-external-link" aria-hidden="true"></i>
        Открыть
      </a>
    </div>`;

  document.getElementById('detail-copy').addEventListener('click', (event) => copyText(url, event.currentTarget));
  document.getElementById('detail-share-url').addEventListener('click', (event) => event.currentTarget.select());
}

function selectItem(id) {
  if (!currentItems.has(id)) return;
  selectedId = id;
  document.querySelectorAll('.file-row').forEach((row) => {
    row.classList.toggle('selected', row.dataset.id === id);
  });
  renderDetail(currentItems.get(id));
}

async function handleListClick(event) {
  const row = event.target.closest('.file-row');
  if (!row) return;
  const item = currentItems.get(row.dataset.id);
  if (!item) return;
  const action = event.target.closest('[data-action]')?.dataset.action;

  if (!action) {
    selectItem(item.id);
    return;
  }

  if (action === 'select') selectItem(item.id);
  if (action === 'navigate') navigateCallback?.(item.id);
  if (action === 'copy') await copyText(shareUrl(item.id), event.target.closest('button'));
  if (action === 'move') await openMoveDialog(item);
  if (action === 'rename-file') {
    const name = window.prompt('Новое имя файла:', item.originalName);
    if (!name?.trim() || name.trim() === item.originalName) return;
    try {
      await api.renameFile(item.id, name.trim());
      selectedId = item.id;
      showToast('Файл переименован');
      await loadFiles(item.id);
    } catch (error) { showToast(error.message); }
  }
  if (action === 'open') {
    if (item.type === 'folder') navigateCallback?.(item.id);
    else window.open(`/v/${encodeURIComponent(item.id)}`, '_blank', 'noopener');
  }
  if (action === 'rename') {
    const name = window.prompt('Новое название папки:', item.name);
    if (!name?.trim() || name.trim() === item.name) return;
    try {
      await api.renameFolder(item.id, name.trim());
      await loadFiles(item.id);
    } catch (error) { showToast(error.message); }
  }
  if (action === 'delete') {
    const label = item.type === 'folder'
      ? `Удалить папку «${item.name}» вместе с содержимым?`
      : `Удалить файл «${item.originalName}»?`;
    if (!window.confirm(label)) return;
    try {
      if (item.type === 'folder') await api.deleteFolder(item.id);
      else await api.deleteFile(item.id);
      if (selectedId === item.id) selectedId = null;
      showToast('Удалено');
      await loadFiles();
    } catch (error) { showToast(error.message); }
  }
}

export function initFileList(onNavigate) {
  navigateCallback = onNavigate;
  document.getElementById('file-list').addEventListener('click', handleListClick);
  document.getElementById('breadcrumbs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-folder-id]');
    if (button) navigateCallback?.(button.dataset.folderId || null);
  });
  document.getElementById('move-form').addEventListener('submit', submitMove);
  document.getElementById('move-cancel').addEventListener('click', closeMoveDialog);
  document.getElementById('move-dialog-close').addEventListener('click', closeMoveDialog);
}

export async function loadFiles(preferredId = null) {
  const list = document.getElementById('file-list');
  if (preferredId) selectedId = preferredId;
  try {
    const data = await api.listFiles(getFolderId());
    renderBreadcrumbs(data.breadcrumbs);
    if (data.storage) {
      document.getElementById('storage-usage').textContent =
        `${formatSize(data.storage.usedBytes)} из ${formatSize(data.storage.limitBytes)}`;
    }
    document.getElementById('list-label').textContent = data.breadcrumbs.at(-1)?.name || 'Сегодня';
    renderRows(data.folders, data.files);
  } catch (error) {
    if (error.status === 401) return;
    list.innerHTML = `<div class="empty-list"><i class="ti ti-alert-circle" aria-hidden="true"></i>${escapeHtml(error.message)}</div>`;
  }
}
