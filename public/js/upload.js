import { api } from './api.js';
import { getFolderId, showToast } from './config.js';

const allowedTypes = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
]);

const extensions = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
};

let maxFileSizeMb = 200;
let afterUpload = null;

function setProgress(percent, label = 'Загрузка…') {
  const progress = document.getElementById('upload-progress');
  progress.hidden = false;
  document.getElementById('progress-label').textContent = label;
  document.getElementById('progress-value').textContent = `${percent}%`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
}

function hideProgress() {
  document.getElementById('upload-progress').hidden = true;
  document.getElementById('progress-fill').style.width = '0%';
}

function validateFiles(files) {
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      throw new Error(`Формат «${file.name}» не поддерживается`);
    }
    if (file.size > maxBytes) {
      throw new Error(`«${file.name}» больше ${maxFileSizeMb} МБ`);
    }
  }
}

async function uploadFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  try {
    validateFiles(files);
  } catch (error) {
    showToast(error.message);
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const folderId = getFolderId();
  if (folderId) formData.append('folderId', folderId);

  setProgress(0, files.length === 1 ? files[0].name : `Файлов: ${files.length}`);
  try {
    const result = await api.upload(formData, (percent) => setProgress(percent,
      files.length === 1 ? files[0].name : `Файлов: ${files.length}`));
    showToast(files.length === 1 ? 'Файл загружен' : `Загружено файлов: ${files.length}`);
    afterUpload?.(result.files?.[0]?.id);
  } catch (error) {
    showToast(error.message);
  } finally {
    hideProgress();
  }
}

async function readClipboard() {
  if (!navigator.clipboard?.read) {
    showToast('Нажмите Ctrl+V, чтобы вставить файл');
    return;
  }

  try {
    const items = await navigator.clipboard.read();
    const files = [];
    for (const item of items) {
      const type = item.types.find((candidate) => allowedTypes.has(candidate));
      if (!type) continue;
      const blob = await item.getType(type);
      const ext = extensions[type] || 'bin';
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      files.push(new File([blob], `clipboard-${stamp}.${ext}`, { type }));
    }
    if (!files.length) throw new Error('В буфере нет поддерживаемого файла');
    await uploadFiles(files);
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      showToast('Разрешите доступ к буферу или нажмите Ctrl+V');
    } else {
      showToast(error.message || 'Не удалось прочитать буфер');
    }
  }
}

export async function initUpload(uploadedCallback) {
  afterUpload = uploadedCallback;
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const uploadButton = document.getElementById('btn-upload');

  try {
    const serverConfig = await api.config();
    maxFileSizeMb = serverConfig.maxFileSizeMb;
    document.getElementById('upload-limits').textContent =
      `PNG, JPG, WebP, GIF, PDF, MP4, WebM, MKV · до ${maxFileSizeMb} МБ`;
  } catch { /* The static 200 MB label remains as a safe fallback. */ }

  uploadButton.addEventListener('click', () => fileInput.click());
  document.getElementById('btn-paste').addEventListener('click', readClipboard);
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    uploadFiles(event.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    uploadFiles(fileInput.files);
    fileInput.value = '';
  });

  document.addEventListener('paste', (event) => {
    const adminVisible = !document.getElementById('admin').hidden;
    const editing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (!adminVisible || editing || !event.clipboardData?.files.length) return;
    event.preventDefault();
    uploadFiles(event.clipboardData.files);
  });
}
