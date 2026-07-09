import { api, ApiError } from './api.js';
import { showToast } from './toast.js';
import { getFolderId } from './folderState.js';
import { strings, pluralFilesUploaded } from './constants/i18n.js';
import { ALLOWED_UPLOAD_MIME_TYPES, DEFAULT_MAX_FILE_SIZE_MB } from './constants/upload.js';

type AfterUploadCallback = (id?: string) => void;

interface UploadRuntime {
  maxFileSizeMb: number;
  allowedTypes: Set<string>;
  afterUpload: AfterUploadCallback | null;
}

const runtime: UploadRuntime = {
  maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
  allowedTypes: new Set<string>(ALLOWED_UPLOAD_MIME_TYPES),
  afterUpload: null,
};

let dragDepth = 0;

function setProgress(percent: number, label: string = strings.upload.uploading): void {
  const progress = document.getElementById('upload-progress');
  if (!progress) return;
  progress.hidden = false;
  const labelEl = document.getElementById('progress-label');
  const valueEl = document.getElementById('progress-value');
  const fillEl = document.getElementById('progress-fill');
  if (labelEl) labelEl.textContent = label;
  if (valueEl) valueEl.textContent = `${percent}%`;
  if (fillEl) fillEl.style.width = `${percent}%`;
}

function hideProgress(): void {
  const progress = document.getElementById('upload-progress');
  const fillEl = document.getElementById('progress-fill');
  if (progress) progress.hidden = true;
  if (fillEl) fillEl.style.width = '0%';
}

function setDragOverlay(active: boolean): void {
  const overlay = document.getElementById('drag-overlay');
  if (overlay) overlay.hidden = !active;
}

function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function validateFiles(files: File[]): void {
  const maxBytes = runtime.maxFileSizeMb * 1024 * 1024;
  for (const file of files) {
    if (!runtime.allowedTypes.has(file.type)) {
      throw new Error(strings.upload.unsupportedFormat(file.name));
    }
    if (file.size > maxBytes) {
      throw new Error(strings.upload.tooLarge(file.name, runtime.maxFileSizeMb));
    }
  }
}

async function uploadFiles(files: File[]): Promise<void> {
  if (!files.length) return;

  try {
    validateFiles(files);
  } catch (error) {
    showToast((error as Error).message);
    return;
  }

  const formData = new FormData();
  for (const file of files) formData.append('files', file);
  const folderId = getFolderId();
  if (folderId) formData.append('folderId', folderId);

  const label = files.length === 1 ? files[0].name : strings.upload.filesCountLabel(files.length);
  setProgress(0, label);
  try {
    const result = await api.upload(formData, (percent) => setProgress(percent, label));
    showToast(pluralFilesUploaded(files.length));
    runtime.afterUpload?.(result.files?.[0]?.id);
  } catch (error) {
    if (error instanceof ApiError) {
      showToast(error.message);
    } else {
      showToast((error as Error).message);
    }
  } finally {
    hideProgress();
  }
}

function initDragAndDrop(workspace: HTMLElement): void {
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
    const files = event.dataTransfer?.files;
    if (files?.length) uploadFiles(Array.from(files));
  });
}

function initFileInput(fileInput: HTMLInputElement): void {
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) uploadFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });
}

function initPasteUpload(): void {
  document.addEventListener('paste', (event) => {
    const admin = document.getElementById('admin');
    const adminVisible = admin ? !admin.hidden : false;
    const target = document.activeElement as HTMLElement | null;
    const editing = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || !!target?.isContentEditable;
    if (!adminVisible || editing || !event.clipboardData?.files.length) return;
    event.preventDefault();
    uploadFiles(Array.from(event.clipboardData.files));
  });
}

async function loadServerConfig(): Promise<void> {
  try {
    const config = await api.config();
    runtime.maxFileSizeMb = config.maxFileSizeMb;
    runtime.allowedTypes = new Set<string>(ALLOWED_UPLOAD_MIME_TYPES);
  } catch { /* keep defaults */ }
}

export function openFilePicker(): void {
  document.getElementById('file-input')?.click();
}

export function getUploadLimitsText(): string {
  return strings.upload.limitsLabel(runtime.maxFileSizeMb);
}

export async function initUpload(afterUpload: AfterUploadCallback): Promise<void> {
  runtime.afterUpload = afterUpload;
  const workspace = document.querySelector<HTMLElement>('.workspace');
  const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  if (!workspace || !fileInput) return;

  await loadServerConfig();

  initDragAndDrop(workspace);
  initFileInput(fileInput);
  initPasteUpload();
}
