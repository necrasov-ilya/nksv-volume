import { api } from './api.js';
import { setFolderId, showToast } from './config.js';

let onAuthSuccess = null;
let secretClicks = 0;
let secretTimer = null;

function openAuth() {
  const overlay = document.getElementById('auth-overlay');
  const input = document.getElementById('auth-input');
  document.getElementById('auth-error').textContent = '';
  overlay.hidden = false;
  requestAnimationFrame(() => input.focus());
}

function closeAuth() {
  const overlay = document.getElementById('auth-overlay');
  overlay.hidden = true;
  document.getElementById('auth-form').reset();
  document.getElementById('auth-error').textContent = '';
}

function showLanding() {
  document.getElementById('admin').hidden = true;
  document.getElementById('landing').hidden = false;
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = document.getElementById('auth-input');
  const error = document.getElementById('auth-error');
  const submit = form.querySelector('button[type="submit"]');
  error.textContent = '';
  submit.disabled = true;

  try {
    await api.auth(input.value);
    closeAuth();
    onAuthSuccess?.();
  } catch (requestError) {
    error.textContent = requestError.message;
    input.select();
  } finally {
    submit.disabled = false;
  }
}

export function initLanding(successCallback) {
  onAuthSuccess = successCallback;
  const overlay = document.getElementById('auth-overlay');

  document.getElementById('landing-secret').addEventListener('click', () => {
    secretClicks += 1;
    clearTimeout(secretTimer);
    secretTimer = setTimeout(() => { secretClicks = 0; }, 1200);
    if (secretClicks >= 5) {
      secretClicks = 0;
      openAuth();
    }
  });
  document.getElementById('auth-close').addEventListener('click', closeAuth);
  document.getElementById('auth-form').addEventListener('submit', submitAuth);
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

export async function logout() {
  try { await api.logout(); } catch { /* The local session is already unusable. */ }
  setFolderId(null);
  showLanding();
  showToast('Вы вышли');
}
