import { api } from './api.js';
import { getFolderId, showToast } from './config.js';

const allowedTypes = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
]);

const extensions: Record<string, string> = {
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
let afterUpload: ((id?: string) => void) | null = null;

function setProgress(percent: number, label: string = 'Загрузка…'): void {
  const progress = document.getElementById('upload-progress') as HTMLElement | null;
  if (!progress) return;
  progress.hidden = false;
  const labelEl = document.getElementById('progress-label') as HTMLElement | null;
  const valueEl = document.getElementById('progress-value') as HTMLElement | null;
  const fillEl = document.getElementById('progress-fill') as HTMLElement | null;
  if (labelEl) labelEl.textContent = label;
  if (valueEl) valueEl.textContent = `${percent}%`;
  if (fillEl) fillEl.style.width = `${percent}%`;
}

function hideProgress(): void {
  const progress = document.getElementById('upload-progress') as HTMLElement | null;
  const fillEl = document.getElementById('progress-fill') as HTMLElement | null;
  if (progress) progress.hidden = true;
  if (fillEl) fillEl.style.width = '0%';
}

function validateFiles(files: File[]): void {
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

async function uploadFiles(fileList: FileList | File[] | null): Promise<void> {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  try {
    validateFiles(files);
  } catch (error) {
    showToast((error as Error).message);
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const folderId = getFolderId();
  if (folderId) formData.append('folderId', folderId);

  const label = files.length === 1 ? files[0].name : `Файлов: ${files.length}`;
  setProgress(0, label);
  try {
    const result = await api.upload(formData, (percent) => setProgress(percent, label));
    showToast(files.length === 1 ? 'Файл загружен' : `Загружено файлов: ${files.length}`);
    afterUpload?.(result.files?.[0]?.id);
  } catch (error) {
    showToast((error as Error).message);
  } finally {
    hideProgress();
  }
}

async function readClipboard(): Promise<void> {
  if (!navigator.clipboard?.read) {
    showToast('Нажмите Ctrl+V, чтобы вставить файл');
    return;
  }

  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];
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
    if ((error as Error).name === 'NotAllowedError') {
      showToast('Разрешите доступ к буферу или нажмите Ctrl+V');
    } else {
      showToast((error as Error).message || 'Не удалось прочитать буфер');
    }
  }
}

export async function initUpload(uploadedCallback: (id?: string) => void): Promise<void> {
  afterUpload = uploadedCallback;
  const dropzone = document.getElementById('dropzone') as HTMLElement | null;
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  const uploadButton = document.getElementById('btn-upload') as HTMLButtonElement | null;
  if (!dropzone || !fileInput || !uploadButton) return;

  try {
    const serverConfig = await api.config();
    maxFileSizeMb = serverConfig.maxFileSizeMb;
    const limitsEl = document.getElementById('upload-limits') as HTMLElement | null;
    if (limitsEl) {
      limitsEl.textContent =
        `PNG, JPG, WebP, GIF, PDF, MP4, WebM, MKV · до ${maxFileSizeMb} МБ`;
    }
  } catch { /* The static 200 MB label remains as a safe fallback. */ }

  uploadButton.addEventListener('click', () => fileInput.click());
  const pasteBtn = document.getElementById('btn-paste') as HTMLButtonElement | null;
  if (pasteBtn) pasteBtn.addEventListener('click', readClipboard);
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
    if (event.dataTransfer) uploadFiles(event.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    uploadFiles(fileInput.files);
    fileInput.value = '';
  });

  document.addEventListener('paste', (event) => {
    const admin = document.getElementById('admin') as HTMLElement | null;
    const adminVisible = admin ? !admin.hidden : false;
    const editing = document.activeElement instanceof HTMLInputElement
      || document.activeElement instanceof HTMLTextAreaElement;
    if (!adminVisible || editing || !event.clipboardData?.files.length) return;
    event.preventDefault();
    uploadFiles(event.clipboardData.files);
  });
}
