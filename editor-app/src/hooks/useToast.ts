import { useCallback } from 'react';
import { TOAST_DURATION_MS } from '../constants/ui.js';

export function useToast(): (message: string) => void {
  return useCallback((message: string) => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS);
  }, []);
}
