import {
  escapeHtml, fileIcon, formatDate, formatSize, isImage, isPdf, isVideo, showToast,
} from './config.js';

const root = document.getElementById('public-root');
const id = location.pathname.split('/').filter(Boolean).pop();

function unavailable() {
  document.title = 'Ничего не отправили · volume';
  root.innerHTML = `
    <section class="public-error">
      <i class="ti ti-inbox" aria-hidden="true"></i>
      <h1>Привет!</h1>
      <p>Тебе пока ничего не отправили. Возможно, ссылка устарела или в ней есть ошибка.</p>
    </section>`;
}

async function copyCurrentLink(button) {
  try {
    await navigator.clipboard.writeText(location.href);
    button.classList.add('copied');
    button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>Скопировано';
    showToast('Ссылка скопирована');
    setTimeout(() => {
      button.classList.remove('copied');
      button.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i>Скопировать ссылку';
    }, 1400);
  } catch {
    window.prompt('Скопируйте ссылку:', location.href);
  }
}

function mediaFor(file) {
  const raw = `/r/${encodeURIComponent(file.id)}`;
  if (isVideo(file.mimeType)) {
    return `<video controls preload="metadata"><source src="${raw}" type="${escapeHtml(file.mimeType)}"></video>`;
  }
  if (isImage(file.mimeType)) {
    return `<img src="${raw}" alt="${escapeHtml(file.originalName)}">`;
  }
  if (isPdf(file.mimeType)) {
    return `<iframe src="${raw}" title="${escapeHtml(file.originalName)}"></iframe>`;
  }
  return `<a class="primary-button" href="${raw}" download><i class="ti ti-download" aria-hidden="true"></i>Скачать файл</a>`;
}

function renderFile(file) {
  document.title = `${file.originalName} · volume`;
  const mediaKind = isVideo(file.mimeType) ? ' is-video' : '';
  root.innerHTML = `
    <section class="public-content public-file-content">
      <div class="public-file-heading">
        <h1 title="${escapeHtml(file.originalName)}">${escapeHtml(file.originalName)}</h1>
      </div>
      <div class="public-media${mediaKind}">${mediaFor(file)}</div>
      <div class="public-file-footer">
        <p class="public-subtitle">${escapeHtml(formatSize(file.size))} · ${escapeHtml(formatDate(file.uploadedAt))}</p>
        <button class="primary-button" id="copy-public-link" type="button">
          <i class="ti ti-copy" aria-hidden="true"></i>
          Скопировать ссылку
        </button>
      </div>
    </section>`;
  document.getElementById('copy-public-link').addEventListener('click', (event) => copyCurrentLink(event.currentTarget));
}

function folderRow(item) {
  const isFolder = item.type === 'folder';
  const name = isFolder ? item.name : item.originalName;
  const meta = isFolder
    ? `${item.itemCount || 0} объектов`
    : `${formatSize(item.size)} · ${formatDate(item.uploadedAt)}`;
  const icon = isFolder ? 'ti-folder' : fileIcon(item.mimeType);
  return `
    <article class="public-row">
      <i class="ti ${icon}" aria-hidden="true"></i>
      <div>
        <a href="/v/${encodeURIComponent(item.id)}">${escapeHtml(name)}</a>
        <p>${escapeHtml(meta)}</p>
      </div>
      <a class="row-action" href="/v/${encodeURIComponent(item.id)}" aria-label="Открыть ${escapeHtml(name)}">
        <i class="ti ti-chevron-right" aria-hidden="true"></i>
      </a>
    </article>`;
}

function renderFolder(folder, items) {
  document.title = `${folder.name} · volume`;
  root.innerHTML = `
    <section class="public-content">
      <div class="public-heading">
        <div>
          <h1>${escapeHtml(folder.name)}</h1>
          <p class="public-subtitle">Общая папка · ${items.length} объектов</p>
        </div>
        <button class="primary-button" id="copy-public-link" type="button">
          <i class="ti ti-copy" aria-hidden="true"></i>
          Скопировать ссылку
        </button>
      </div>
      ${items.length
        ? `<div class="public-list">${items.map(folderRow).join('')}</div>`
        : '<div class="empty-list"><i class="ti ti-folder-open" aria-hidden="true"></i>В этой папке пока пусто</div>'}
    </section>`;
  document.getElementById('copy-public-link').addEventListener('click', (event) => copyCurrentLink(event.currentTarget));
}

async function init() {
  try {
    let response = await fetch(`/api/share/${encodeURIComponent(id)}`);
    let payload;
    if (response.ok) {
      payload = await response.json();
    } else {
      // The pre-update server only knows this endpoint. Keep existing file
      // links alive until that process is restarted.
      response = await fetch(`/api/meta/${encodeURIComponent(id)}`);
      if (!response.ok) return unavailable();
      payload = { type: 'file', item: await response.json() };
    }
    if (payload.type === 'folder') renderFolder(payload.item, payload.items);
    else renderFile(payload.item);
  } catch {
    unavailable();
  }
}

init();
