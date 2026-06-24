(() => {
  const storageKey = 'nksv_theme';
  const modes = ['system', 'light', 'dark'];
  const labels = {
    system: 'Системная тема',
    light: 'Светлая тема',
    dark: 'Тёмная тема',
  };
  const icons = {
    system: 'ti-device-desktop',
    light: 'ti-sun',
    dark: 'ti-moon',
  };

  function readMode() {
    try {
      const saved = localStorage.getItem(storageKey);
      return modes.includes(saved) ? saved : 'system';
    } catch {
      return 'system';
    }
  }

  function saveMode(mode) {
    try {
      if (mode === 'system') localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, mode);
    } catch {
      // The theme still works for the current page when storage is unavailable.
    }
  }

  function updateButtons(mode) {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const icon = button.querySelector('.ti');
      if (icon) icon.className = `ti ${icons[mode]}`;
      button.setAttribute('aria-label', `${labels[mode]}. Сменить тему`);
      button.setAttribute('title', `${labels[mode]}. Сменить тему`);
    });
  }

  function applyMode(mode, persist = false) {
    if (mode === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = mode;
    if (persist) saveMode(mode);
    updateButtons(mode);
  }

  function initButtons() {
    updateButtons(readMode());
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = readMode();
        const next = modes[(modes.indexOf(current) + 1) % modes.length];
        applyMode(next, true);
      });
    });
  }

  applyMode(readMode());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons, { once: true });
  } else {
    initButtons();
  }
})();
