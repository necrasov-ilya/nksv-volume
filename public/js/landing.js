import { getToken, setToken, clearToken, showToast } from './config.js';
import { api } from './api.js';

const TRIPLE_CLICK_DELAY = 600;
let clickCount = 0;
let clickTimer = null;

export function initLanding(onAuthSuccess) {
  const dot = document.getElementById('landing-dot');
  if (dot) {
    dot.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, TRIPLE_CLICK_DELAY);
      if (clickCount >= 3) {
        clickCount = 0;
        openAuth(onAuthSuccess);
      }
    });
  }

  const savedToken = getToken();
  if (savedToken) {
    validateSession(onAuthSuccess);
  }
}

async function validateSession(onAuthSuccess) {
  try {
    await api.listFiles(null);
    onAuthSuccess();
  } catch {
    clearToken();
  }
}

function openAuth(onAuthSuccess) {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.add('active');
  const input = document.getElementById('auth-input');
  input.value = '';
  input.focus();

  const errorEl = document.getElementById('auth-error');
  errorEl.classList.remove('active');

  const handleKey = async (e) => {
    if (e.key === 'Enter') {
      const password = input.value;
      try {
        const res = await api.auth(password);
        if (res.ok) {
          const data = await res.json();
          setToken(data.token);
          closeAuth();
          input.removeEventListener('keydown', handleKey);
          onAuthSuccess();
        } else {
          showError(errorEl);
        }
      } catch {
        showError(errorEl);
      }
    } else if (e.key === 'Escape') {
      closeAuth();
      input.removeEventListener('keydown', handleKey);
    }
  };

  input.addEventListener('keydown', handleKey);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeAuth();
      input.removeEventListener('keydown', handleKey);
    }
  };
}

function showError(el) {
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 2000);
}

function closeAuth() {
  document.getElementById('auth-overlay').classList.remove('active');
}

export function logout() {
  clearToken();
  document.getElementById('admin').classList.remove('active');
  document.getElementById('landing').style.display = 'flex';
  showToast('Вы вышли');
}
