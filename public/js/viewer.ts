import { formatDate, formatSize } from './format.js';
import { showToast } from './toast.js';
import { resolveItemIcon } from './itemKind.js';
import { escapeHtml } from './html.js';
import {
  API_META, API_SHARE, PUBLIC_FILE_ROUTE, PUBLIC_VIEW_ROUTE,
} from './constants/routes.js';
import { APP_TITLE_SUFFIX } from './constants/ui.js';
import { copyButton, DEFAULT_PUBLIC_DURATION } from './copyButton.js';
import { strings, pluralObjects } from './constants/i18n.js';
import type {
  ClientFileEntry, ShareArticleItem, ShareFolderItem, ShareResponse,
} from './types.js';

type ShareItem = ClientFileEntry | ShareFolderItem | ShareArticleItem;

const root = document.getElementById('public-root') as HTMLElement | null;
const id = location.pathname.split('/').filter(Boolean).pop() ?? '';

function setDocumentTitle(value: string): void {
  document.title = `${value} ${strings.common.separator} ${APP_TITLE_SUFFIX}`;
}

function renderUnavailable(): void {
  if (!root) return;
  setDocumentTitle(strings.viewer.unavailable.title);
  root.innerHTML = `
    <section class="public-error">
      <i class="ti ti-inbox" aria-hidden="true"></i>
      <h1>${escapeHtml(strings.viewer.unavailable.hello)}</h1>
      <p>${escapeHtml(strings.viewer.unavailable.message)}</p>
    </section>`;
}

function mediaFor(file: ClientFileEntry): string {
  const raw = PUBLIC_FILE_ROUTE(file.id);
  if (file.mimeType.startsWith('video/')) {
    return `<video controls preload="metadata"><source src="${raw}" type="${escapeHtml(file.mimeType)}"></video>`;
  }
  if (file.mimeType.startsWith('image/')) {
    return `<img src="${raw}" alt="${escapeHtml(file.originalName)}">`;
  }
  if (file.mimeType === 'application/pdf') {
    return `<iframe src="${raw}" title="${escapeHtml(file.originalName)}" sandbox></iframe>`;
  }
  return `<a class="primary-button" href="${raw}" download><i class="ti ti-download" aria-hidden="true"></i>${escapeHtml(strings.viewer.download)}</a>`;
}

function renderFile(file: ClientFileEntry): void {
  if (!root) return;
  setDocumentTitle(file.originalName);
  const mediaKind = file.mimeType.startsWith('video/') ? ' is-video' : '';
  root.innerHTML = `
    <section class="public-content public-file-content">
      <div class="public-file-heading">
        <h1 title="${escapeHtml(file.originalName)}">${escapeHtml(file.originalName)}</h1>
      </div>
      <div class="public-media${mediaKind}">${mediaFor(file)}</div>
      <div class="public-file-footer">
        <p class="public-subtitle">${escapeHtml(formatSize(file.size))} · ${escapeHtml(formatDate(file.uploadedAt))}</p>
        <div class="public-copy-slot" data-copy-value="${escapeHtml(location.href)}"></div>
      </div>
    </section>`;
  const slot = root.querySelector<HTMLElement>('.public-copy-slot');
  if (slot) {
    copyButton(slot, {
      durationMs: DEFAULT_PUBLIC_DURATION,
      idleLabel: strings.viewer.copy.copyLink,
      copiedLabel: strings.viewer.copy.copied,
      promptFallback: strings.viewer.copy.copyPrompt,
      onCopied: () => showToast(strings.viewer.copy.linkCopied),
    });
  }
}

function renderArticle(item: ShareArticleItem & { html: string }): void {
  if (!root) return;
  setDocumentTitle(item.title);
  const subtitle = item.annotation
    ? `<p class="public-subtitle">${escapeHtml(item.annotation)}</p>`
    : `<p class="public-subtitle">${escapeHtml(strings.viewer.articleLabel)}${strings.common.separator}${escapeHtml(formatDate(item.updatedAt))}</p>`;
  const cover = item.coverImage
    ? `<div class="public-article-cover"><img src="${escapeHtml(item.coverImage)}" alt=""></div>`
    : '';
  root.innerHTML = `
    ${cover}
    <section class="public-content public-article-content">
      <div class="public-heading">
        <div>
          <h1>${escapeHtml(item.title)}</h1>
          ${subtitle}
        </div>
        <div class="public-copy-slot" data-copy-value="${escapeHtml(location.href)}"></div>
      </div>
      <div class="article-body">${item.html}</div>
    </section>`;
  const slot = root.querySelector<HTMLElement>('.public-copy-slot');
  if (slot) {
    copyButton(slot, {
      durationMs: DEFAULT_PUBLIC_DURATION,
      idleLabel: strings.viewer.copy.copyLink,
      copiedLabel: strings.viewer.copy.copied,
      promptFallback: strings.viewer.copy.copyPrompt,
      onCopied: () => showToast(strings.viewer.copy.linkCopied),
    });
  }
}

function itemName(item: ShareItem): string {
  if (item.type === 'folder') return item.name;
  if (item.type === 'article') return item.title;
  return item.originalName;
}

function itemMeta(item: ShareItem): string {
  if (item.type === 'folder') return pluralObjects(item.itemCount || 0);
  if (item.type === 'article') {
    return `${strings.viewer.articleLabel}${strings.common.separator}${formatDate(item.updatedAt)}`;
  }
  return `${formatSize(item.size)}${strings.common.separator}${formatDate(item.uploadedAt)}`;
}

function itemIcon(item: ShareItem): string {
  if (item.type === 'folder') return 'ti-folder';
  if (item.type === 'article') return 'ti-article';
  return resolveItemIcon(item);
}

function folderRow(item: ShareItem): string {
  const name = itemName(item);
  const href = PUBLIC_VIEW_ROUTE(item.id);
  return `
    <article class="public-row">
      <i class="ti ${itemIcon(item)}" aria-hidden="true"></i>
      <div>
        <a href="${href}">${escapeHtml(name)}</a>
        <p>${escapeHtml(itemMeta(item))}</p>
      </div>
      <a class="row-action" href="${href}" aria-label="${escapeHtml(strings.viewer.folder.openAriaLabelPrefix)}${escapeHtml(name)}">
        <i class="ti ti-chevron-right" aria-hidden="true"></i>
      </a>
    </article>`;
}

function renderFolder(folder: { name: string }, items: ShareItem[]): void {
  if (!root) return;
  setDocumentTitle(folder.name);
  root.innerHTML = `
    <section class="public-content">
      <div class="public-heading">
        <div>
          <h1>${escapeHtml(folder.name)}</h1>
          <p class="public-subtitle">${escapeHtml(strings.viewer.folder.sharedFolder)}${strings.common.separator}${escapeHtml(pluralObjects(items.length))}</p>
        </div>
        <div class="public-copy-slot" data-copy-value="${escapeHtml(location.href)}"></div>
      </div>
      ${items.length
        ? `<div class="public-list">${items.map(folderRow).join('')}</div>`
        : `<div class="empty-list"><i class="ti ti-folder-open" aria-hidden="true"></i>${escapeHtml(strings.viewer.folder.empty)}</div>`}
    </section>`;
  const slot = root.querySelector<HTMLElement>('.public-copy-slot');
  if (slot) {
    copyButton(slot, {
      durationMs: DEFAULT_PUBLIC_DURATION,
      idleLabel: strings.viewer.copy.copyLink,
      copiedLabel: strings.viewer.copy.copied,
      promptFallback: strings.viewer.copy.copyPrompt,
      onCopied: () => showToast(strings.viewer.copy.linkCopied),
    });
  }
}

async function fetchShare(): Promise<ShareResponse | null> {
  try {
    const response = await fetch(API_SHARE(id));
    if (response.ok) return await response.json() as ShareResponse;
  } catch { /* fall through to meta */ }

  try {
    const response = await fetch(API_META(id));
    if (!response.ok) return null;
    const item = await response.json() as ClientFileEntry | ShareArticleItem;
    if (item.type === 'article') return null;
    return { type: 'file', item };
  } catch {
    return null;
  }
}

async function init(): Promise<void> {
  if (!root) return;
  const payload = await fetchShare();
  if (!payload) return renderUnavailable();
  if (payload.type === 'folder') renderFolder(payload.item, payload.items);
  else if (payload.type === 'article') renderArticle(payload.item);
  else renderFile(payload.item);
}

init();
