import { resolveItemIcon, resolveItemLabel, isImageMime, isVideoMime, isPdfMime } from '../itemKind.js';
import { formatDate, formatSize } from '../format.js';
import { escapeHtml } from '../html.js';
import { EDITOR_ROUTE, PUBLIC_FILE_ROUTE, PUBLIC_VIEW_ROUTE } from '../constants/routes.js';
import { strings, pluralObjects } from '../constants/i18n.js';
import { getUploadLimitsText } from '../upload.js';
import type { ClientEntry, ClientArticleEntry, Breadcrumb } from '../types.js';

export function articleStatusLabel(status: ClientArticleEntry['status']): string {
  return status === 'published'
    ? strings.fileList.articleStatus.published
    : strings.fileList.articleStatus.draft;
}

export function itemCountLabel(count: number = 0): string {
  return pluralObjects(count);
}

export function itemMeta(item: ClientEntry): string {
  if (item.type === 'folder') return itemCountLabel(item.itemCount);
  if (item.type === 'article') {
    return `${articleStatusLabel(item.status)}${strings.common.separator}${formatDate(item.updatedAt)}`;
  }
  return `${formatSize(item.size)}${strings.common.separator}${formatDate(item.uploadedAt)}`;
}

export function visualFor(item: ClientEntry): string {
  if (item.type === 'folder') {
    return '<div class="item-visual"><i class="ti ti-folder" aria-hidden="true"></i></div>';
  }
  if (item.type === 'article') {
    if (item.coverImage) {
      return `<div class="item-visual media cover"><img src="${escapeHtml(item.coverImage)}" alt="" loading="lazy"></div>`;
    }
    return '<div class="item-visual"><i class="ti ti-article" aria-hidden="true"></i></div>';
  }
  if (isImageMime(item.mimeType)) {
    return `<div class="item-visual media"><img src="${PUBLIC_FILE_ROUTE(item.id)}" alt="" loading="lazy"></div>`;
  }
  if (isVideoMime(item.mimeType)) {
    return `<div class="item-visual media"><video src="${PUBLIC_FILE_ROUTE(item.id)}#t=0.1" muted preload="metadata" aria-hidden="true"></video></div>`;
  }
  return `<div class="item-visual"><i class="ti ${resolveItemIcon(item)}" aria-hidden="true"></i></div>`;
}

export function previewFor(item: ClientEntry): string {
  if (item.type === 'folder') return '<i class="ti ti-folder" aria-hidden="true"></i>';
  if (item.type === 'article') {
    if (item.coverImage) {
      return `<img src="${escapeHtml(item.coverImage)}" alt="${escapeHtml(item.title)}" class="detail-article-cover">`;
    }
    const note = item.annotation
      ? `<p class="detail-annotation">${escapeHtml(item.annotation)}</p>`
      : '';
    return `<div class="detail-article-preview"><i class="ti ti-article" aria-hidden="true"></i>${note}</div>`;
  }
  const raw = PUBLIC_FILE_ROUTE(item.id);
  if (isImageMime(item.mimeType)) return `<img src="${raw}" alt="${escapeHtml(item.originalName)}">`;
  if (isVideoMime(item.mimeType)) return `<video src="${raw}" controls preload="metadata"></video>`;
  if (isPdfMime(item.mimeType)) return `<iframe src="${raw}" title="${escapeHtml(item.originalName)}" sandbox></iframe>`;
  return `<i class="ti ${resolveItemIcon(item)}" aria-hidden="true"></i>`;
}

function openLabel(item: ClientEntry): string {
  if (item.type === 'folder') return strings.fileList.menu.openFolder;
  if (item.type === 'article') return strings.fileList.menu.edit;
  return strings.fileList.menu.openFile;
}

function menuButton(action: string, icon: string, label: string, extra = ''): string {
  return `<button type="button" data-action="${action}"${extra ? ` ${extra}` : ''}><i class="ti ${icon}" aria-hidden="true"></i>${escapeHtml(label)}</button>`;
}

export function menuFor(item: ClientEntry): string {
  const move = item.type === 'file' ? menuButton('move', 'ti-folder-symlink', strings.fileList.menu.move) : '';
  const renameFile = item.type === 'file' ? menuButton('rename-file', 'ti-pencil', strings.fileList.menu.rename) : '';
  const renameFolder = item.type === 'folder' ? menuButton('rename', 'ti-pencil', strings.fileList.menu.rename) : '';
  const publish = item.type === 'article' && item.status === 'draft'
    ? menuButton('publish', 'ti-world', strings.fileList.menu.publish)
    : '';
  const unpublish = item.type === 'article' && item.status === 'published'
    ? menuButton('unpublish', 'ti-eye-off', strings.fileList.menu.unpublishLabel, `aria-label="${escapeHtml(strings.fileList.menu.unpublishAriaLabel)}"`)
    : '';
  return `
    <details class="row-menu">
      <summary class="row-action" aria-label="${escapeHtml(strings.fileList.menu.moreActionsAriaLabel)}"><i class="ti ti-dots-vertical" aria-hidden="true"></i></summary>
      <div class="row-menu-popover">
        ${menuButton('open', 'ti-external-link', openLabel(item))}
        ${move}
        ${renameFile}
        ${renameFolder}
        ${publish}
        ${unpublish}
        <button class="danger" type="button" data-action="delete"><i class="ti ti-trash" aria-hidden="true"></i>${escapeHtml(strings.fileList.menu.delete)}</button>
      </div>
    </details>`;
}

export function rowTemplate(item: ClientEntry, selectedId: string | null): string {
  const name = item.type === 'folder'
    ? item.name
    : item.type === 'article'
      ? item.title
      : item.originalName;
  const selected = item.id === selectedId ? ' selected' : '';
  const nameButton = item.type === 'folder'
    ? `<button class="item-name" type="button" data-action="navigate">${escapeHtml(name)}</button>`
    : item.type === 'article'
      ? `<a class="item-name" href="${EDITOR_ROUTE(item.id)}">${escapeHtml(name)}</a>`
      : `<button class="item-name" type="button" data-action="select">${escapeHtml(name)}</button>`;
  return `
    <article class="file-row${selected}" data-id="${escapeHtml(item.id)}" data-type="${item.type}">
      ${visualFor(item)}
      <div class="item-copy">
        ${nameButton}
        <p class="item-meta">${escapeHtml(itemMeta(item))}</p>
      </div>
      <button class="row-action" type="button" data-action="copy" aria-label="${escapeHtml(strings.fileList.copy.rowAriaLabel)}">
        <i class="ti ti-copy" aria-hidden="true"></i>
      </button>
      ${menuFor(item)}
    </article>`;
}

export function breadcrumbsTemplate(crumbs: Breadcrumb[]): string {
  const parentId = crumbs.length > 1 ? crumbs[crumbs.length - 1]!.id : '';
  const parts: string[] = [];
  if (crumbs.length) {
    parts.push(`
      <button class="crumb-up" type="button" data-folder-id="${escapeHtml(parentId)}" aria-label="${escapeHtml(strings.fileList.breadcrumbs.upAriaLabel)}">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
        ${escapeHtml(strings.fileList.breadcrumbs.upLabel)}
      </button>`);
  }
  parts.push(`<button class="crumb" type="button" data-folder-id="">${escapeHtml(strings.fileList.breadcrumbs.allFiles)}</button>`);
  for (const crumb of crumbs) {
    parts.push('<span class="crumb-separator" aria-hidden="true">/</span>');
    parts.push(`<button class="crumb" type="button" data-folder-id="${escapeHtml(crumb.id)}">${escapeHtml(crumb.name)}</button>`);
  }
  return parts.join('');
}

export function emptyStateTemplate(): string {
  return `
    <div class="empty-list empty-state" data-drop-target>
      <i class="ti ti-folder-open" aria-hidden="true"></i>
      <p class="empty-state-title">${escapeHtml(strings.fileList.emptyState.title)}</p>
      <p class="empty-state-lead">${escapeHtml(strings.fileList.emptyState.lead)}</p>
      <p class="empty-state-hint">${escapeHtml(getUploadLimitsText())}</p>
    </div>`;
}

export function detailTemplate(item: ClientEntry, url: string): string {
  const name = item.type === 'folder'
    ? item.name
    : item.type === 'article'
      ? item.title
      : item.originalName;
  const meta = item.type === 'folder'
    ? itemCountLabel(item.itemCount)
    : item.type === 'article'
      ? `${articleStatusLabel(item.status)}${strings.common.separator}${resolveItemLabel(item)}`
      : `${formatSize(item.size)}${strings.common.separator}${resolveItemLabel(item)}`;
  const editAction = item.type === 'article'
    ? `<a class="detail-open" href="${EDITOR_ROUTE(item.id)}">
        <i class="ti ti-pencil" aria-hidden="true"></i>
        ${escapeHtml(strings.fileList.menu.edit)}
      </a>`
    : `<a class="detail-open" href="${PUBLIC_VIEW_ROUTE(item.id)}" target="_blank" rel="noopener">
        <i class="ti ti-external-link" aria-hidden="true"></i>
        ${escapeHtml(strings.fileList.detail.open)}
      </a>`;
  return `
    <h2 class="detail-title" title="${escapeHtml(name)}">${escapeHtml(name)}</h2>
    <div class="detail-preview">${previewFor(item)}</div>
    <p class="detail-meta">${escapeHtml(meta)}</p>
    <div class="share-block">
      <label class="share-label" for="detail-share-url">${escapeHtml(strings.fileList.detail.publicLinkLabel)}</label>
      <div class="share-control">
        <input id="detail-share-url" value="${escapeHtml(url)}" readonly>
      </div>
    </div>
    <div class="detail-actions">
      <button class="primary-button" id="detail-copy" type="button">
        <i class="ti ti-copy" aria-hidden="true"></i>
        ${escapeHtml(strings.fileList.detail.copyLink)}
      </button>
      ${editAction}
    </div>`;
}

export function detailEmptyTemplate(): string {
  return `
    <div class="detail-empty">
      <i class="ti ti-file" aria-hidden="true"></i>
      <p>${escapeHtml(strings.fileList.detail.empty)}</p>
    </div>`;
}
