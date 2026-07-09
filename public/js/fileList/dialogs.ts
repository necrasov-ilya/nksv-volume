import { api } from '../api.js';
import { escapeHtml } from '../html.js';
import { showToast } from '../toast.js';
import { strings } from '../constants/i18n.js';
import type { ClientFileEntry } from '../types.js';
import type { ListState } from './state.js';

export interface MoveDialogHandles {
  open(item: ClientFileEntry): Promise<void>;
  close(): void;
}

export function createMoveDialog(state: ListState): MoveDialogHandles {
  const dialog = document.getElementById('move-dialog') as HTMLDialogElement | null;
  const form = document.getElementById('move-form') as HTMLFormElement | null;
  const nameEl = document.getElementById('move-file-name');
  const select = document.getElementById('move-target') as HTMLSelectElement | null;
  const cancelBtn = document.getElementById('move-cancel') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('move-dialog-close') as HTMLButtonElement | null;
  const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  function close(): void {
    dialog?.close();
    state.movingItem = null;
  }

  async function open(item: ClientFileEntry): Promise<void> {
    try {
      const data = await api.listFolders();
      state.movingItem = item;
      if (nameEl) nameEl.textContent = item.originalName;
      if (!select) return;
      select.innerHTML = [
        `<option value="">${escapeHtml(strings.fileList.moveDialog.allFilesOption)}</option>`,
        ...data.folders.map((folder) =>
          `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.path)}</option>`),
      ].join('');
      select.value = item.folderId || '';
      dialog?.showModal();
      requestAnimationFrame(() => select.focus());
    } catch (error) {
      showToast((error as Error).message);
    }
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!state.movingItem) return;
    const targetFolderId = select?.value || null;
    if ((state.movingItem.folderId || null) === targetFolderId) {
      close();
      showToast(strings.fileList.moveDialog.alreadyThere);
      return;
    }
    if (submitBtn) submitBtn.disabled = true;
    try {
      await api.moveFile(state.movingItem.id, targetFolderId);
      close();
      state.selectedId = null;
      showToast(strings.fileList.moveDialog.moved);
      await state.reload();
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  form?.addEventListener('submit', submit);
  cancelBtn?.addEventListener('click', close);
  closeBtn?.addEventListener('click', close);

  return { open, close };
}
