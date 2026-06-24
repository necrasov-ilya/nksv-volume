import { initLanding, logout } from './landing.js';
import { initUpload } from './upload.js';
import { initFileList, loadFiles } from './fileList.js';
import { getFolderId, setFolderId, showToast } from './config.js';
import { api } from './api.js';

function showAdmin(): void {
  const landing = document.getElementById('landing') as HTMLElement | null;
  const admin = document.getElementById('admin') as HTMLElement | null;
  if (landing) landing.hidden = true;
  if (admin) admin.hidden = false;
  loadFiles();
}

function navigateTo(folderId: string | null): void {
  setFolderId(folderId);
  loadFiles();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFolderDialog(): void {
  const dialog = document.getElementById('folder-dialog') as HTMLDialogElement | null;
  const form = document.getElementById('folder-form') as HTMLFormElement | null;
  if (form) form.reset();
  if (dialog) dialog.showModal();
  requestAnimationFrame(() => {
    const input = document.getElementById('folder-name') as HTMLInputElement | null;
    if (input) input.focus();
  });
}

function closeFolderDialog(): void {
  const dialog = document.getElementById('folder-dialog') as HTMLDialogElement | null;
  if (dialog) dialog.close();
}

async function createFolder(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const input = document.getElementById('folder-name') as HTMLInputElement | null;
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  const submit = (event.currentTarget as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (submit) submit.disabled = true;
  try {
    const result = await api.createFolder(name, getFolderId());
    closeFolderDialog();
    showToast('Папка создана');
    await loadFiles(result.folder.id);
  } catch (error) {
    showToast((error as Error).message);
  } finally {
    if (submit) submit.disabled = false;
  }
}

function init(): void {
  initFileList(navigateTo);
  initUpload((uploadedId) => loadFiles(uploadedId));
  initLanding(showAdmin);

  const logoutBtn = document.getElementById('btn-logout') as HTMLButtonElement | null;
  if (logoutBtn) logoutBtn.addEventListener('click', () => { void logout(); });
  const newFolderBtn = document.getElementById('btn-new-folder') as HTMLButtonElement | null;
  if (newFolderBtn) newFolderBtn.addEventListener('click', openFolderDialog);
  const folderForm = document.getElementById('folder-form') as HTMLFormElement | null;
  if (folderForm) folderForm.addEventListener('submit', createFolder);
  const folderCancel = document.getElementById('folder-cancel') as HTMLButtonElement | null;
  if (folderCancel) folderCancel.addEventListener('click', closeFolderDialog);
  const folderDialogClose = document.getElementById('folder-dialog-close') as HTMLButtonElement | null;
  if (folderDialogClose) folderDialogClose.addEventListener('click', closeFolderDialog);
}

document.addEventListener('DOMContentLoaded', init);
