(() => {
  const storageKey = 'nksv_theme';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function readPreference() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch {
      return null;
    }
  }

  function savePreference(mode) {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      // The theme still works for the current page when storage is unavailable.
    }
  }

  function activeMode(preference = readPreference()) {
    return preference || (mediaQuery.matches ? 'dark' : 'light');
  }

  function updateButtons(mode) {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    const label = nextMode === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему';
    const iconClass = nextMode === 'dark' ? 'ti-moon' : 'ti-sun';

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const icon = button.querySelector('.ti');
      if (icon) icon.className = `ti ${iconClass}`;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  }

  function applyPreference(preference, persist = false) {
    if (preference) document.documentElement.dataset.theme = preference;
    else document.documentElement.removeAttribute('data-theme');
    if (persist && preference) savePreference(preference);
    updateButtons(activeMode(preference));
  }

  function initButtons() {
    updateButtons(activeMode());
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = activeMode() === 'dark' ? 'light' : 'dark';
        applyPreference(nextMode, true);
      });
    });
  }

  mediaQuery.addEventListener('change', () => {
    if (!readPreference()) applyPreference(null);
  });

  applyPreference(readPreference());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons, { once: true });
  } else {
    initButtons();
  }
})();
