import { api } from './api.js';
import {
  escapeHtml, extensionLabel, fileIcon, formatDate, formatSize,
  getFolderId, isImage, isPdf, isVideo, setFolderId, showToast,
} from './config.js';
import type {
  ClientEntry, ClientFileEntry, ClientFolderEntry,
  Breadcrumb, FileListResponse, FolderListResponse,
} from './types.js';

let navigateCallback: ((folderId: string | null) => void) | null = null;
let currentItems = new Map<string, ClientEntry>();
let selectedId: string | null = null;
let movingItem: ClientFileEntry | null = null;

function itemCountLabel(count: number = 0): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} объект`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${count} объекта`;
  return `${count} объектов`;
}

function shareUrl(id: string): string {
  return `${location.origin}/v/${id}`;
}

async function copyText(value: string, button: HTMLElement | null): Promise<void> {
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

function renderBreadcrumbs(crumbs: Breadcrumb[]): void {
  const breadcrumbs = document.getElementById('breadcrumbs') as HTMLElement | null;
  if (!breadcrumbs) return;
  const parentId = crumbs.length > 1 ? crumbs[crumbs.length - 2].id : '';
  const parts: string[] = [];
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

function visualFor(item: ClientEntry): string {
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

function menuFor(item: ClientEntry): string {
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

async function openMoveDialog(item: ClientFileEntry): Promise<void> {
  try {
    const data = await api.listFolders();
    movingItem = item;
    const nameEl = document.getElementById('move-file-name') as HTMLElement | null;
    if (nameEl) nameEl.textContent = item.originalName;
    const select = document.getElementById('move-target') as HTMLSelectElement | null;
    if (!select) return;
    select.innerHTML = [
      '<option value="">Все файлы</option>',
      ...data.folders.map((folder) =>
        `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.path)}</option>`),
    ].join('');
    select.value = item.folderId || '';
    const dialog = document.getElementById('move-dialog') as HTMLDialogElement | null;
    if (dialog) dialog.showModal();
    requestAnimationFrame(() => select.focus());
  } catch (error) {
    showToast((error as Error).message);
  }
}

function closeMoveDialog(): void {
  const dialog = document.getElementById('move-dialog') as HTMLDialogElement | null;
  if (dialog) dialog.close();
  movingItem = null;
}

async function submitMove(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!movingItem) return;
  const select = document.getElementById('move-target') as HTMLSelectElement | null;
  const targetFolderId = select?.value || null;
  if ((movingItem.folderId || null) === targetFolderId) {
    closeMoveDialog();
    showToast('Файл уже находится в этой папке');
    return;
  }

  const submit = (event.currentTarget as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (submit) submit.disabled = true;
  try {
    await api.moveFile(movingItem.id, targetFolderId);
    closeMoveDialog();
    selectedId = null;
    showToast('Файл перемещён');
    await loadFiles();
  } catch (error) {
    showToast((error as Error).message);
  } finally {
    if (submit) submit.disabled = false;
  }
}

function renderRows(folders: (ClientFolderEntry & { itemCount: number })[], files: ClientFileEntry[]): void {
  const list = document.getElementById('file-list') as HTMLElement | null;
  if (!list) return;
  const items: ClientEntry[] = [...folders, ...files];
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

  if (!currentItems.has(selectedId ?? '')) {
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

  renderDetail(currentItems.get(selectedId ?? '') ?? null);
}

function previewFor(item: ClientEntry): string {
  if (item.type === 'folder') return '<i class="ti ti-folder" aria-hidden="true"></i>';
  const raw = `/r/${encodeURIComponent(item.id)}`;
  if (isImage(item.mimeType)) return `<img src="${raw}" alt="${escapeHtml(item.originalName)}">`;
  if (isVideo(item.mimeType)) return `<video src="${raw}" controls preload="metadata"></video>`;
  if (isPdf(item.mimeType)) return `<iframe src="${raw}" title="${escapeHtml(item.originalName)}"></iframe>`;
  return `<i class="ti ${fileIcon(item.mimeType)}" aria-hidden="true"></i>`;
}

function renderDetail(item: ClientEntry | null): void {
  const panel = document.getElementById('detail-panel') as HTMLElement | null;
  if (!panel) return;
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

  const copyBtn = document.getElementById('detail-copy') as HTMLButtonElement | null;
  if (copyBtn) {
    copyBtn.addEventListener('click', (event) => copyText(url, event.currentTarget as HTMLButtonElement));
  }
  const shareInput = document.getElementById('detail-share-url') as HTMLInputElement | null;
  if (shareInput) {
    shareInput.addEventListener('click', (event) => (event.currentTarget as HTMLInputElement).select());
  }
}

function selectItem(id: string): void {
  if (!currentItems.has(id)) return;
  selectedId = id;
  document.querySelectorAll('.file-row').forEach((row) => {
    row.classList.toggle('selected', (row as HTMLElement).dataset.id === id);
  });
  renderDetail(currentItems.get(id) ?? null);
}

async function handleListClick(event: MouseEvent): Promise<void> {
  const target = event.target as Element;
  const row = target.closest('.file-row') as HTMLElement | null;
  if (!row || !row.dataset.id) return;
  const item = currentItems.get(row.dataset.id);
  if (!item) return;
  const actionEl = target.closest('[data-action]') as HTMLElement | null;
  const action = actionEl?.dataset.action;

  if (!action) {
    selectItem(item.id);
    return;
  }

  if (action === 'select') selectItem(item.id);
  if (action === 'navigate') navigateCallback?.(item.id);
  if (action === 'copy') await copyText(shareUrl(item.id), target.closest('button'));
  if (action === 'move' && item.type === 'file') await openMoveDialog(item);
  if (action === 'rename-file' && item.type === 'file') {
    const name = window.prompt('Новое имя файла:', item.originalName);
    if (!name?.trim() || name.trim() === item.originalName) return;
    try {
      await api.renameFile(item.id, name.trim());
      selectedId = item.id;
      showToast('Файл переименован');
      await loadFiles(item.id);
    } catch (error) { showToast((error as Error).message); }
  }
  if (action === 'open') {
    if (item.type === 'folder') navigateCallback?.(item.id);
    else window.open(`/v/${encodeURIComponent(item.id)}`, '_blank', 'noopener');
  }
  if (action === 'rename' && item.type === 'folder') {
    const name = window.prompt('Новое название папки:', item.name);
    if (!name?.trim() || name.trim() === item.name) return;
    try {
      await api.renameFolder(item.id, name.trim());
      await loadFiles(item.id);
    } catch (error) { showToast((error as Error).message); }
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
    } catch (error) { showToast((error as Error).message); }
  }
}

export function initFileList(onNavigate: (folderId: string | null) => void): void {
  navigateCallback = onNavigate;
  const list = document.getElementById('file-list') as HTMLElement | null;
  if (list) list.addEventListener('click', handleListClick);
  const breadcrumbs = document.getElementById('breadcrumbs') as HTMLElement | null;
  if (breadcrumbs) {
    breadcrumbs.addEventListener('click', (event) => {
      const button = (event.target as Element).closest('[data-folder-id]') as HTMLElement | null;
      if (button) navigateCallback?.(button.dataset.folderId || null);
    });
  }
  const moveForm = document.getElementById('move-form') as HTMLFormElement | null;
  if (moveForm) moveForm.addEventListener('submit', submitMove);
  const moveCancel = document.getElementById('move-cancel') as HTMLButtonElement | null;
  if (moveCancel) moveCancel.addEventListener('click', closeMoveDialog);
  const moveDialogClose = document.getElementById('move-dialog-close') as HTMLButtonElement | null;
  if (moveDialogClose) moveDialogClose.addEventListener('click', closeMoveDialog);
}

export async function loadFiles(preferredId?: string | null): Promise<void> {
  const list = document.getElementById('file-list') as HTMLElement | null;
  if (preferredId) selectedId = preferredId;
  try {
    const data = await api.listFiles(getFolderId());
    renderBreadcrumbs(data.breadcrumbs);
    if (data.storage) {
      const storageEl = document.getElementById('storage-usage') as HTMLElement | null;
      if (storageEl) {
        storageEl.textContent =
          `${formatSize(data.storage.usedBytes)} из ${formatSize(data.storage.limitBytes)}`;
      }
    }
    const labelEl = document.getElementById('list-label') as HTMLElement | null;
    if (labelEl) {
      labelEl.textContent = data.breadcrumbs.at(-1)?.name || 'Сегодня';
    }
    renderRows(data.folders, data.files);
  } catch (error) {
    if ((error as ApiError).status === 401) return;
    if (list) {
      list.innerHTML = `<div class="empty-list"><i class="ti ti-alert-circle" aria-hidden="true"></i>${escapeHtml((error as Error).message)}</div>`;
    }
  }
}

interface ApiError extends Error {
  status: number;
}
