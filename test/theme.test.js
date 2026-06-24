import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('theme toggle cycles system, light and dark without touching page links', () => {
  const source = fs.readFileSync(new URL('../public/js/theme.js', import.meta.url), 'utf8');
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
  const context = {
    document: {
      readyState: 'complete',
      documentElement,
      querySelectorAll: () => [button],
    },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };

  vm.runInNewContext(source, context);
  assert.equal(documentElement.dataset.theme, undefined);
  assert.equal(icon.className, 'ti ti-device-desktop');

  listeners.get('click')();
  assert.equal(documentElement.dataset.theme, 'light');
  assert.equal(values.get('nksv_theme'), 'light');
  assert.equal(icon.className, 'ti ti-sun');

  listeners.get('click')();
  assert.equal(documentElement.dataset.theme, 'dark');
  assert.equal(values.get('nksv_theme'), 'dark');
  assert.equal(icon.className, 'ti ti-moon');

  listeners.get('click')();
  assert.equal(documentElement.dataset.theme, undefined);
  assert.equal(values.has('nksv_theme'), false);
  assert.equal(icon.className, 'ti ti-device-desktop');
});
