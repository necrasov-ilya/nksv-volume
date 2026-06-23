import { initLanding, logout } from './landing.js';
import { initUpload } from './upload.js';
import { initFileList, loadFiles } from './fileList.js';
import { getFolderId, setFolderId, showToast } from './config.js';
import { api } from './api.js';

function showAdmin() {
  document.getElementById('landing').hidden = true;
  document.getElementById('admin').hidden = false;
  loadFiles();
}

function navigateTo(folderId) {
  setFolderId(folderId);
  loadFiles();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFolderDialog() {
  const dialog = document.getElementById('folder-dialog');
  document.getElementById('folder-form').reset();
  dialog.showModal();
  requestAnimationFrame(() => document.getElementById('folder-name').focus());
}

function closeFolderDialog() {
  document.getElementById('folder-dialog').close();
}

async function createFolder(event) {
  event.preventDefault();
  const input = document.getElementById('folder-name');
  const name = input.value.trim();
  if (!name) return;

  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const result = await api.createFolder(name, getFolderId());
    closeFolderDialog();
    showToast('Папка создана');
    await loadFiles(result.folder.id);
  } catch (error) {
    showToast(error.message);
  } finally {
    submit.disabled = false;
  }
}

function init() {
  initFileList(navigateTo);
  initUpload((uploadedId) => loadFiles(uploadedId));
  initLanding(showAdmin);

  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-new-folder').addEventListener('click', openFolderDialog);
  document.getElementById('folder-form').addEventListener('submit', createFolder);
  document.getElementById('folder-cancel').addEventListener('click', closeFolderDialog);
  document.getElementById('folder-dialog-close').addEventListener('click', closeFolderDialog);
}

document.addEventListener('DOMContentLoaded', init);
