import { initLanding, logout } from './landing.js';
import { initUpload } from './upload.js';
import { initFileList, loadFiles } from './fileList.js';
import { getFolderId, setFolderId, showToast } from './config.js';
import { api } from './api.js';

function showAdmin() {
  document.querySelector('.landing').style.display = 'none';
  document.querySelector('.admin').classList.add('active');
  loadFiles();
}

function navigateTo(folderId) {
  setFolderId(folderId);
  loadFiles();
}

async function createFolder() {
  const name = prompt('Folder name:');
  if (!name?.trim()) return;
  try {
    await api.createFolder(name.trim(), getFolderId());
    showToast('Folder created');
    loadFiles();
  } catch {
    showToast('Failed to create folder');
  }
}

function init() {
  initFileList(navigateTo);
  initUpload(loadFiles);
  initLanding(showAdmin);

  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-new-folder').addEventListener('click', createFolder);
}

document.addEventListener('DOMContentLoaded', init);
