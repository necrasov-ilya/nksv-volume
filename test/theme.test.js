import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/js/theme.js', import.meta.url), 'utf8');

function createContext(systemIsDark = false) {
  const values = new Map();
  const icon = { className: '' };
  const listeners = new Map();
  const button = {
    querySelector: () => icon,
    setAttribute() {},
    addEventListener: (event, callback) => listeners.set(event, callback),
  };
  const documentElement = {
    dataset: {},
    removeAttribute: (name) => {
      if (name === 'data-theme') delete documentElement.dataset.theme;
    },
  };
  const mediaListeners = new Map();
  const context = {
    document: {
      readyState: 'complete',
      documentElement,
      querySelectorAll: () => [button],
    },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    window: {
      matchMedia: () => ({
        matches: systemIsDark,
        addEventListener: (event, callback) => mediaListeners.set(event, callback),
      }),
    },
  };

  vm.runInNewContext(source, context);
  return { button, documentElement, icon, listeners, values };
}

test('follows the light system theme until the first click, then toggles explicitly', () => {
  const { documentElement, icon, listeners, values } = createContext(false);

  assert.equal(documentElement.dataset.theme, undefined);
  assert.equal(icon.className, 'ti ti-moon');

  listeners.get('click')();
  assert.equal(documentElement.dataset.theme, 'dark');
  assert.equal(values.get('nksv_theme'), 'dark');
  assert.equal(icon.className, 'ti ti-sun');

  listeners.get('click')();
  assert.equal(documentElement.dataset.theme, 'light');
  assert.equal(values.get('nksv_theme'), 'light');
  assert.equal(icon.className, 'ti ti-moon');
});

test('first click switches a dark system theme to light', () => {
  const { documentElement, icon, listeners, values } = createContext(true);

  assert.equal(documentElement.dataset.theme, undefined);
  assert.equal(icon.className, 'ti ti-sun');

  listeners.get('click')();
  assert.equal(documentElement.dataset.theme, 'light');
  assert.equal(values.get('nksv_theme'), 'light');
  assert.equal(icon.className, 'ti ti-moon');
});
