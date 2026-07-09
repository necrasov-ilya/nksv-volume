(() => {
  const storageKey = 'nksv_theme';
  const legacyStorageKey = 'nksv-theme';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function readPreference(): 'light' | 'dark' | null {
    try {
      let saved = localStorage.getItem(storageKey);
      if (saved !== 'light' && saved !== 'dark') {
        const legacy = localStorage.getItem(legacyStorageKey);
        if (legacy === 'light' || legacy === 'dark') {
          localStorage.setItem(storageKey, legacy);
          localStorage.removeItem(legacyStorageKey);
          saved = legacy;
        }
      }
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch {
      return null;
    }
  }

  function savePreference(mode: 'light' | 'dark'): void {
    try {
      localStorage.setItem(storageKey, mode);
      localStorage.removeItem(legacyStorageKey);
    } catch {}
  }

  function activeMode(preference: 'light' | 'dark' | null = readPreference()): 'light' | 'dark' {
    return preference || (mediaQuery.matches ? 'dark' : 'light');
  }

  function updateButtons(mode: 'light' | 'dark'): void {
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

  function applyPreference(preference: 'light' | 'dark' | null, persist = false): void {
    if (preference) document.documentElement.dataset.theme = preference;
    else document.documentElement.removeAttribute('data-theme');
    if (persist && preference) savePreference(preference);
    updateButtons(activeMode(preference));
  }

  function initButtons(): void {
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