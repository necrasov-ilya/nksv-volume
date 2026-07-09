import { api } from './api.js';
import { getFolderId, showToast } from './config.js';

const allowedTypes = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
]);

let maxFileSizeMb = 200;
let afterUpload: ((id?: string) => void) | null = null;
let dragDepth = 0;

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

function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function setDragOverlay(active: boolean): void {
  const overlay = document.getElementById('drag-overlay') as HTMLElement | null;
  if (overlay) overlay.hidden = !active;
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

export function openFilePicker(): void {
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  fileInput?.click();
}

export function getUploadLimitsText(): string {
  return `PNG, JPG, WebP, GIF, PDF, MP4, WebM, MKV · до ${maxFileSizeMb} МБ`;
}

export async function initUpload(uploadedCallback: (id?: string) => void): Promise<void> {
  afterUpload = uploadedCallback;
  const workspace = document.querySelector('.workspace') as HTMLElement | null;
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  if (!workspace || !fileInput) return;

  try {
    const serverConfig = await api.config();
    maxFileSizeMb = serverConfig.maxFileSizeMb;
  } catch { /* fallback */ }

  workspace.addEventListener('dragenter', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepth += 1;
    setDragOverlay(true);
  });

  workspace.addEventListener('dragover', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
  });

  workspace.addEventListener('dragleave', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) setDragOverlay(false);
  });

  workspace.addEventListener('drop', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepth = 0;
    setDragOverlay(false);
    if (event.dataTransfer?.files.length) uploadFiles(event.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    uploadFiles(fileInput.files);
    fileInput.value = '';
  });

  document.addEventListener('paste', (event) => {
    const admin = document.getElementById('admin') as HTMLElement | null;
    const adminVisible = admin ? !admin.hidden : false;
    const editing = document.activeElement instanceof HTMLInputElement
      || document.activeElement instanceof HTMLTextAreaElement
      || (document.activeElement as HTMLElement | null)?.isContentEditable;
    if (!adminVisible || editing || !event.clipboardData?.files.length) return;
    event.preventDefault();
    uploadFiles(event.clipboardData.files);
  });
}