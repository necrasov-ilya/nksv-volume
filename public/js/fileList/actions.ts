import { api } from '../api.js';
import { showToast } from '../toast.js';
import { EDITOR_ROUTE, PUBLIC_VIEW_ROUTE } from '../constants/routes.js';
import { strings } from '../constants/i18n.js';
import type { ClientEntry, ClientFileEntry, ClientFolderEntry, ClientArticleEntry } from '../types.js';
import type { ListState } from './state.js';

async function renameFile(item: ClientFileEntry, state: ListState): Promise<void> {
  const name = window.prompt(strings.fileList.renamePrompts.file, item.originalName);
  if (!name?.trim() || name.trim() === item.originalName) return;
  await api.renameFile(item.id, name.trim());
  state.selectedId = item.id;
  showToast(strings.fileList.toasts.fileRenamed);
  await state.reload();
}

async function renameFolder(item: ClientFolderEntry, state: ListState): Promise<void> {
  const name = window.prompt(strings.fileList.renamePrompts.folder, item.name);
  if (!name?.trim() || name.trim() === item.name) return;
  await api.renameFolder(item.id, name.trim());
  await state.reload();
}

async function publishArticle(item: ClientArticleEntry, state: ListState): Promise<void> {
  await api.updateArticle(item.id, { status: 'published' });
  showToast(strings.fileList.toasts.articlePublished);
  await state.reload();
}

async function unpublishArticle(item: ClientArticleEntry, state: ListState): Promise<void> {
  await api.updateArticle(item.id, { status: 'draft' });
  showToast(strings.fileList.toasts.articleUnpublished);
  await state.reload();
}

function confirmDelete(item: ClientEntry): boolean {
  const label = item.type === 'folder'
    ? strings.fileList.deleteConfirm.folder(item.name)
    : item.type === 'article'
      ? strings.fileList.deleteConfirm.article(item.title)
      : strings.fileList.deleteConfirm.file(item.originalName);
  return window.confirm(label);
}

async function deleteItem(item: ClientEntry, state: ListState): Promise<void> {
  if (!confirmDelete(item)) return;
  if (item.type === 'folder') await api.deleteFolder(item.id);
  else if (item.type === 'article') await api.deleteArticle(item.id);
  else await api.deleteFile(item.id);
  if (state.selectedId === item.id) state.selectedId = null;
  showToast(strings.fileList.toasts.deleted);
  await state.reload();
}

function openItem(item: ClientEntry, state: ListState): void {
  if (item.type === 'folder') state.navigate?.(item.id);
  else if (item.type === 'article') window.location.href = EDITOR_ROUTE(item.id);
  else window.open(PUBLIC_VIEW_ROUTE(item.id), '_blank', 'noopener');
}

export interface ActionContext {
  state: ListState;
  openMoveDialog(item: ClientFileEntry): Promise<void>;
}

type ActionFn = (item: ClientEntry, ctx: ActionContext) => void | Promise<void>;

export const actions: Record<string, ActionFn> = {
  select(item, { state }) {
    state.selectedId = item.id;
  },
  navigate(item, { state }) {
    state.navigate?.(item.id);
  },
  open(item, ctx) {
    openItem(item, ctx.state);
  },
  copy() {
    // handled by copyButton in detail panel; row copy is delegated to global handler
  },
  async move(item, ctx) {
    if (item.type === 'file') await ctx.openMoveDialog(item);
  },
  async 'rename-file'(item, ctx) {
    if (item.type === 'file') await renameFile(item, ctx.state);
  },
  async rename(item, ctx) {
    if (item.type === 'folder') await renameFolder(item, ctx.state);
  },
  async publish(item, ctx) {
    if (item.type === 'article') await publishArticle(item, ctx.state);
  },
  async unpublish(item, ctx) {
    if (item.type === 'article') await unpublishArticle(item, ctx.state);
  },
  async delete(item, ctx) {
    await deleteItem(item, ctx.state);
  },
};
