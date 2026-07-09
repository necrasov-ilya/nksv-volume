import { api, ApiError } from '../api.js';
import { copyButton } from '../copyButton.js';
import { showToast } from '../toast.js';
import { formatSize } from '../format.js';
import { escapeHtml } from '../html.js';
import { getFolderId } from '../folderState.js';
import { getUploadLimitsText } from '../upload.js';
import { COPY_FEEDBACK_DURATION_MS } from '../constants/ui.js';
import { strings } from '../constants/i18n.js';
import type { ClientEntry, ClientFileEntry, ClientFolderEntry, ClientArticleEntry } from '../types.js';
import {
  createListState, firstSelectable, shareUrl,
  type ListState, type NavigateCallback, type ItemAction,
} from './state.js';
import {
  breadcrumbsTemplate, detailEmptyTemplate, detailTemplate,
  emptyStateTemplate, rowTemplate,
} from './render.js';
import { actions } from './actions.js';
import { createMoveDialog } from './dialogs.js';

export type { ListState, NavigateCallback } from './state.js';

interface FileListRefs {
  list: HTMLElement | null;
  breadcrumbs: HTMLElement | null;
  detail: HTMLElement | null;
  listLabel: HTMLElement | null;
  storage: HTMLElement | null;
  uploadLimits: HTMLElement | null;
}

function getRefs(): FileListRefs {
  return {
    list: document.getElementById('file-list'),
    breadcrumbs: document.getElementById('breadcrumbs'),
    detail: document.getElementById('detail-panel'),
    listLabel: document.getElementById('list-label'),
    storage: document.getElementById('storage-usage'),
    uploadLimits: document.getElementById('upload-limits'),
  };
}

function updateHeader(refs: FileListRefs, response: Awaited<ReturnType<typeof api.listFiles>>): void {
  if (refs.breadcrumbs) {
    refs.breadcrumbs.innerHTML = breadcrumbsTemplate(response.breadcrumbs);
    const buttons = refs.breadcrumbs.querySelectorAll('.crumb');
    buttons[buttons.length - 1]?.setAttribute('aria-current', 'page');
  }
  if (refs.storage && response.storage) {
    refs.storage.textContent = strings.common.storageFormat(
      formatSize(response.storage.usedBytes),
      formatSize(response.storage.limitBytes),
    );
  }
  if (refs.listLabel) {
    refs.listLabel.textContent = response.breadcrumbs.at(-1)?.name || strings.fileList.todayFallback;
  }
  if (refs.uploadLimits) refs.uploadLimits.textContent = getUploadLimitsText();
}

function collectItems(
  folders: (ClientFolderEntry & { itemCount: number })[],
  files: ClientFileEntry[],
  articles: ClientArticleEntry[],
): ClientEntry[] {
  return [...folders, ...articles, ...files];
}

function renderList(items: ClientEntry[], selectedId: string | null): string {
  return items.map((item) => rowTemplate(item, selectedId)).join('');
}

function renderRows(
  state: ListState,
  refs: FileListRefs,
  items: ClientEntry[],
  firstItemId: string | null,
): void {
  state.items = new Map(items.map((item) => [item.id, item]));
  if (!items.length) {
    state.selectedId = null;
    if (refs.list) refs.list.innerHTML = emptyStateTemplate();
    renderDetail(refs, null, '');
    return;
  }
  if (!state.selectedId || !state.items.has(state.selectedId)) {
    state.selectedId = firstItemId ?? firstSelectable(state)?.id ?? null;
  }
  if (refs.list) refs.list.innerHTML = renderList(items, state.selectedId);
  renderDetail(refs, state.items.get(state.selectedId ?? '') ?? null, shareUrl(state.selectedId ?? ''));
}

function renderDetail(refs: FileListRefs, item: ClientEntry | null, url: string): void {
  if (!refs.detail) return;
  if (!item) {
    refs.detail.innerHTML = detailEmptyTemplate();
    return;
  }
  refs.detail.innerHTML = detailTemplate(item, url);
  const copyBtn = document.getElementById('detail-copy') as HTMLButtonElement | null;
  const shareInput = document.getElementById('detail-share-url') as HTMLInputElement | null;
  if (shareInput) shareInput.addEventListener('click', (event) => (event.currentTarget as HTMLInputElement).select());
  if (copyBtn) {
    copyButton(copyBtn.parentElement ?? refs.detail, {
      durationMs: COPY_FEEDBACK_DURATION_MS,
      idleLabel: strings.fileList.detail.copyLink,
      copiedLabel: strings.fileList.copy.copied,
      promptFallback: strings.fileList.copy.copyPrompt,
      onCopied: () => showToast(strings.fileList.copy.linkCopied),
    });
  }
}

export async function loadFiles(preferredId: string | null = null, state: ListState): Promise<void> {
  const refs = getRefs();
  if (preferredId) state.selectedId = preferredId;
  try {
    const response = await api.listFiles(getFolderId());
    updateHeader(refs, response);
    const items = collectItems(response.folders, response.files, response.articles ?? []);
    renderRows(state, refs, items, response.files[0]?.id ?? response.articles[0]?.id ?? null);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return;
    if (refs.list) {
      refs.list.innerHTML = `<div class="empty-list"><i class="ti ti-alert-circle" aria-hidden="true"></i>${escapeHtml((error as Error).message)}</div>`;
    }
  }
}

function dispatchAction(
  action: ItemAction,
  item: ClientEntry,
  state: ListState,
  openMoveDialog: (item: ClientFileEntry) => Promise<void>,
): Promise<void> {
  const handler = actions[action];
  if (!handler) return Promise.resolve();
  return Promise.resolve(handler(item, { state, openMoveDialog })).catch((error) => {
    showToast((error as Error).message);
  });
}

export function initFileList(navigate: NavigateCallback): ListState {
  const refs = getRefs();
  const state = createListState(
    () => loadFiles(null, state),
    navigate,
  );
  const moveDialog = createMoveDialog(state);

  refs.list?.addEventListener('click', async (event) => {
    const target = event.target as Element;
    const row = target.closest('.file-row') as HTMLElement | null;
    if (!row?.dataset.id) return;
    const item = state.items.get(row.dataset.id);
    if (!item) return;
    const actionEl = target.closest('[data-action]') as HTMLElement | null;
    const action = actionEl?.dataset.action as ItemAction | undefined;

    if (!action) {
      if (target.closest('a.item-name')) return;
      state.selectedId = item.id;
      document.querySelectorAll('.file-row').forEach((rowEl) => {
        rowEl.classList.toggle('selected', (rowEl as HTMLElement).dataset.id === item.id);
      });
      renderDetail(refs, item, shareUrl(item.id));
      return;
    }

    if (action === 'copy') {
      const button = target.closest('button');
      await copyText(shareUrl(item.id), button ?? null);
      return;
    }

    await dispatchAction(action, item, state, moveDialog.open);
    if (action === 'select' || action === 'navigate' || action === 'delete') {
      // re-render selection state
      document.querySelectorAll('.file-row').forEach((rowEl) => {
        rowEl.classList.toggle('selected', (rowEl as HTMLElement).dataset.id === state.selectedId);
      });
      renderDetail(refs, state.items.get(state.selectedId ?? '') ?? null, shareUrl(state.selectedId ?? ''));
    }
  });

  refs.breadcrumbs?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest('[data-folder-id]') as HTMLElement | null;
    if (button) navigate(button.dataset.folderId || null);
  });

  return state;
}

async function copyText(value: string, button: HTMLElement | null): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    button?.classList.add('copied');
    const icon = button?.querySelector('.ti');
    if (icon) icon.className = 'ti ti-check';
    else if (button) button.textContent = strings.fileList.copy.copied;
    setTimeout(() => {
      button?.classList.remove('copied');
      if (icon) icon.className = 'ti ti-copy';
    }, COPY_FEEDBACK_DURATION_MS);
    showToast(strings.fileList.copy.linkCopied);
  } catch {
    window.prompt(strings.fileList.copy.copyPrompt, value);
  }
}
