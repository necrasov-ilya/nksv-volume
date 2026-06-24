import { api } from './api.js';
import { setFolderId, showToast } from './config.js';

let onAuthSuccess: (() => void) | null = null;
let secretClicks = 0;
let secretTimer: ReturnType<typeof setTimeout> | null = null;

function openAuth(): void {
  const overlay = document.getElementById('auth-overlay') as HTMLElement | null;
  const input = document.getElementById('auth-input') as HTMLInputElement | null;
  const errorEl = document.getElementById('auth-error') as HTMLElement | null;
  if (!overlay || !input || !errorEl) return;
  errorEl.textContent = '';
  overlay.hidden = false;
  requestAnimationFrame(() => input.focus());
}

function closeAuth(): void {
  const overlay = document.getElementById('auth-overlay') as HTMLElement | null;
  const form = document.getElementById('auth-form') as HTMLFormElement | null;
  const errorEl = document.getElementById('auth-error') as HTMLElement | null;
  if (overlay) overlay.hidden = true;
  if (form) form.reset();
  if (errorEl) errorEl.textContent = '';
}

function showLanding(): void {
  const admin = document.getElementById('admin') as HTMLElement | null;
  const landing = document.getElementById('landing') as HTMLElement | null;
  if (admin) admin.hidden = true;
  if (landing) landing.hidden = false;
}

async function submitAuth(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const input = document.getElementById('auth-input') as HTMLInputElement | null;
  const error = document.getElementById('auth-error') as HTMLElement | null;
  const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (!input || !error || !submit) return;
  error.textContent = '';
  submit.disabled = true;

  try {
    await api.auth(input.value);
    closeAuth();
    onAuthSuccess?.();
  } catch (requestError) {
    error.textContent = (requestError as Error).message;
    input.select();
  } finally {
    submit.disabled = false;
  }
}

export function initLanding(successCallback: () => void): void {
  onAuthSuccess = successCallback;
  const overlay = document.getElementById('auth-overlay') as HTMLElement | null;
  if (!overlay) return;

  const secret = document.getElementById('landing-secret') as HTMLElement | null;
  if (secret) {
    secret.addEventListener('click', () => {
      secretClicks += 1;
      if (secretTimer) clearTimeout(secretTimer);
      secretTimer = setTimeout(() => { secretClicks = 0; }, 1200);
      if (secretClicks >= 5) {
        secretClicks = 0;
        openAuth();
      }
    });
  }

  const authClose = document.getElementById('auth-close') as HTMLElement | null;
  if (authClose) authClose.addEventListener('click', closeAuth);

  const authForm = document.getElementById('auth-form') as HTMLFormElement | null;
  if (authForm) authForm.addEventListener('submit', submitAuth);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeAuth();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) closeAuth();
    if (event.ctrlKey && event.shiftKey && event.code === 'Period') {
      event.preventDefault();
      openAuth();
    }
  });

  window.addEventListener('session-expired', () => {
    setFolderId(null);
    showLanding();
    showToast('Сессия завершилась. Войдите снова.');
  });

  api.session().then(successCallback).catch(() => showLanding());
}

export async function logout(): Promise<void> {
  try { await api.logout(); } catch { /* The local session is already unusable. */ }
  setFolderId(null);
  showLanding();
  showToast('Вы вышли');
}
