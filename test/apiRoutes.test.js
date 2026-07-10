import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nksv-api-'));
process.env.ADMIN_PASSWORD = 'test-password-for-api-routes';

const { config } = await import('../src/config.ts');
config.paths.data = path.join(tempRoot, 'data');
config.paths.articles = path.join(config.paths.data, 'articles');
config.paths.metaFile = path.join(config.paths.data, 'files.json');
config.paths.uploads = path.join(tempRoot, 'uploads');

const { default: app } = await import('../src/app.ts');

function startServer() {
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('protects draft metadata and persists type-safe metadata updates', async () => {
  const server = await startServer();
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let cookie = '';

  async function request(url, options = {}) {
    const headers = new Headers(options.headers);
    if (cookie) headers.set('Cookie', cookie);
    return fetch(`${baseUrl}${url}`, { ...options, headers });
  }

  try {
    let response = await request('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
    });
    assert.equal(response.status, 200);
    cookie = (response.headers.getSetCookie()[0] ?? '').split(';', 1)[0];

    response = await request('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Раздел' }),
    });
    assert.equal(response.status, 200);
    const folder = (await response.json()).folder;

    response = await request(`/api/folders/${folder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Переименованный раздел' }),
    });
    assert.equal(response.status, 200);

    response = await request('/api/folders');
    const folders = (await response.json()).folders;
    assert.equal(folders.find((item) => item.id === folder.id)?.name, 'Переименованный раздел');

    const upload = new FormData();
    upload.append('files', new Blob(['image'], { type: 'image/png' }), 'image.png');
    response = await request('/api/upload', { method: 'POST', body: upload });
    assert.equal(response.status, 200);
    const file = (await response.json()).files[0];

    response = await request(`/api/files/${file.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'renamed.png', folderId: folder.id }),
    });
    assert.equal(response.status, 200);

    response = await request(`/api/files?folderId=${encodeURIComponent(folder.id)}`);
    const folderItems = await response.json();
    assert.equal(folderItems.files.find((item) => item.id === file.id)?.originalName, 'renamed.png');

    response = await request('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Черновик', folderId: folder.id }),
    });
    assert.equal(response.status, 201);
    const article = (await response.json()).article;

    response = await request(`/api/meta/${article.id}`);
    assert.equal(response.status, 404);

    response = await request(`/api/articles/${article.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Опубликованная статья', status: 'published' }),
    });
    assert.equal(response.status, 200);

    response = await request(`/api/articles/${article.id}`);
    const updated = await response.json();
    assert.equal(updated.article.title, 'Опубликованная статья');
    assert.equal(updated.article.status, 'published');

    response = await request(`/api/meta/${article.id}`);
    assert.equal(response.status, 200);

    response = await request(`/api/files/${article.id}`, { method: 'DELETE' });
    assert.equal(response.status, 404);

    response = await request(`/api/articles/${folder.id}`, { method: 'DELETE' });
    assert.equal(response.status, 404);

    response = await request(`/api/articles/${article.id}`);
    assert.equal(response.status, 200);

    response = await request(`/api/articles/${article.id}`, { method: 'DELETE' });
    assert.equal(response.status, 200);
    response = await request(`/api/folders/${folder.id}`, { method: 'DELETE' });
    assert.equal(response.status, 200);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
