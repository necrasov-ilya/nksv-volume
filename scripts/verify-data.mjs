#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metaFile = process.env.META_FILE || path.join(root, 'data', 'files.json');
const uploadsDir = process.env.UPLOADS_DIR || path.join(root, 'uploads');
const articlesDir = process.env.ARTICLES_DIR || path.join(root, 'data', 'articles');
const baseUrl = process.env.BASE_URL?.replace(/\/$/, '');
const checkHttp = process.argv.includes('--http') || Boolean(baseUrl);

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function loadMeta() {
  if (!fs.existsSync(metaFile)) {
    fail(`Не найден ${metaFile}`);
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    if (!Array.isArray(data)) {
      fail('files.json должен быть массивом');
      return [];
    }
    return data;
  } catch (error) {
    fail(`Не удалось прочитать files.json: ${(error).message}`);
    return [];
  }
}

function requiredFields(entry) {
  if (!entry?.id || typeof entry.id !== 'string') return false;
  if (!('folderId' in entry)) return false;
  return true;
}

function verifyEntries(meta) {
  const counts = { folder: 0, file: 0, article: 0, bad: 0 };
  const samples = { file: [], folder: [], article: [] };

  for (const entry of meta) {
    if (!requiredFields(entry)) {
      counts.bad += 1;
      fail(`Запись без id или folderId: ${JSON.stringify(entry).slice(0, 120)}`);
      continue;
    }

    if (entry.type === 'folder') {
      counts.folder += 1;
      if (!entry.name) fail(`Папка ${entry.id} без name`);
      if (samples.folder.length < 2) samples.folder.push(entry.id);
      continue;
    }

    if (entry.type === 'file') {
      counts.file += 1;
      if (!entry.storedName) fail(`Файл ${entry.id} без storedName`);
      if (!entry.originalName) fail(`Файл ${entry.id} без originalName`);
      if (!entry.mimeType) fail(`Файл ${entry.id} без mimeType`);
      if (entry.storedName) {
        const filePath = path.join(uploadsDir, entry.storedName);
        if (!fs.existsSync(filePath)) {
          fail(`Файл ${entry.id}: нет бинарника ${entry.storedName} в uploads/`);
        }
      }
      if (samples.file.length < 3) samples.file.push(entry.id);
      continue;
    }

    if (entry.type === 'article') {
      counts.article += 1;
      if (!entry.title) fail(`Статья ${entry.id} без title`);
      const contentPath = path.join(articlesDir, `${entry.id}.json`);
      if (!fs.existsSync(contentPath)) {
        fail(`Статья ${entry.id}: нет тела ${entry.id}.json в data/articles/`);
      }
      if (samples.article.length < 2) samples.article.push(entry.id);
      continue;
    }

    counts.bad += 1;
    fail(`Запись ${entry.id} с неизвестным type="${entry.type ?? ''}"`);
  }

  return { counts, samples };
}

async function verifyHttp(samples) {
  if (!checkHttp || !baseUrl) return;
  const ids = [...samples.file, ...samples.folder, ...samples.article].slice(0, 5);
  if (!ids.length) {
    warn('HTTP-проверка пропущена: нет объектов для выборки');
    return;
  }

  for (const id of ids) {
    const shareUrl = `${baseUrl}/api/share/${encodeURIComponent(id)}`;
    try {
      const response = await fetch(shareUrl);
      if (!response.ok) {
        fail(`HTTP ${response.status} для ${shareUrl}`);
        continue;
      }
      const payload = await response.json();
      if (!payload?.type || !payload?.item) {
        fail(`Некорректный ответ share API для ${id}`);
      }
    } catch (error) {
      fail(`Не удалось проверить ${shareUrl}: ${(error).message}`);
    }
  }

  for (const id of samples.file.slice(0, 2)) {
    const rawUrl = `${baseUrl}/r/${encodeURIComponent(id)}`;
    try {
      const response = await fetch(rawUrl, { method: 'HEAD' });
      if (!response.ok) fail(`HTTP ${response.status} для ${rawUrl}`);
    } catch (error) {
      fail(`Не удалось проверить ${rawUrl}: ${(error).message}`);
    }
  }
}

function printReport(meta, result) {
  console.log('Проверка данных volume');
  console.log(`meta: ${metaFile}`);
  console.log(`uploads: ${uploadsDir}`);
  if (fs.existsSync(articlesDir)) console.log(`articles: ${articlesDir}`);
  console.log('');
  console.log(`Записей: ${meta.length}`);
  console.log(`  folder: ${result.counts.folder}`);
  console.log(`  file: ${result.counts.file}`);
  console.log(`  article: ${result.counts.article}`);
  if (result.counts.bad) console.log(`  bad: ${result.counts.bad}`);
  console.log('');

  const publicLinks = [
    ...result.samples.file.map((id) => `${baseUrl || 'https://YOUR_DOMAIN'}/v/${id}`),
    ...result.samples.folder.map((id) => `${baseUrl || 'https://YOUR_DOMAIN'}/v/${id}`),
  ];

  if (publicLinks.length) {
    console.log('Публичные ссылки для ручной проверки после деплоя:');
    for (const link of publicLinks) console.log(`  ${link}`);
    console.log('');
  }

  if (warnings.length) {
    console.log('Предупреждения:');
    for (const message of warnings) console.log(`  ! ${message}`);
    console.log('');
  }

  if (errors.length) {
    console.log('Ошибки:');
    for (const message of errors) console.log(`  × ${message}`);
    console.log('');
    console.log('Итог: FAIL');
    process.exitCode = 1;
    return;
  }

  console.log('Итог: OK');
}

const meta = loadMeta();
const result = verifyEntries(meta);
await verifyHttp(result.samples);
printReport(meta, result);