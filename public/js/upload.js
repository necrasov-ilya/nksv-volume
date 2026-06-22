import { api } from './api.js';
import { getFolderId, showToast } from './config.js';

export function initUpload(onUploaded) {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleUpload(e.dataTransfer.files, onUploaded);
  });

  fileInput.addEventListener('change', () => {
    handleUpload(fileInput.files, onUploaded);
    fileInput.value = '';
  });
}

async function handleUpload(files, onUploaded) {
  if (!files.length) return;

  const formData = new FormData();
  for (const f of files) formData.append('files', f);

  const folderId = getFolderId();
  if (folderId) formData.append('folderId', folderId);

  const progressEl = document.querySelector('.upload-progress');
  const fillEl = document.querySelector('.progress-fill');
  progressEl.classList.add('active');
  fillEl.style.width = '0%';

  try {
    await api.upload(formData, (pct) => {
      fillEl.style.width = pct + '%';
    });
    showToast(`Uploaded ${files.length} file(s)`);
    onUploaded();
  } catch (err) {
    showToast('Upload failed: ' + err.message);
  } finally {
    fillEl.style.width = '0%';
    progressEl.classList.remove('active');
  }
}
