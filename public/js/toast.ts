import { TOAST_DURATION_MS } from './constants/ui.js';

const toastTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimers.get(toast));
  toastTimers.set(toast, setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS));
}
