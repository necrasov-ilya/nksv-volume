import { api } from './api.js';
import {
  getFolderId, setFolderId, showToast, escapeHtml,
  formatSize, formatDate, isImage, isVideo,
} from './config.js';

let onNavigate = null;

export function initFileList(navigateCallback) {
  onNavigate = navigateCallback;
}

export async function loadFiles() {
  const folderId = getFolderId();
  const container = document.getElementById('file-list');

  try {
    const data = await api.listFiles(folderId);
    renderBreadcrumbs(data.breadcrumbs);
    renderFolders(data.folders);
    renderFiles(data.files);
  } catch {
    container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:2rem">Failed to load</p>';
  }
}

function renderBreadcrumbs(crumbs) {
  const el = document.getElementById('breadcrumbs');
  if (!crumbs.length) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';

  let html = `<button class="crumb" onclick="window.__nksv.navigate(null)">Root</button>`;
  for (const c of crumbs) {
    html += `<span class="crumb-sep">/</span>`;
    html += `<button class="crumb" onclick="window.__nksv.navigate('${c.id}')">${escapeHtml(c.name)}</button>`;
  }
  el.innerHTML = html;
}

function renderFolders(folders) {
  const container = document.getElementById('folder-grid');
  if (!folders.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = 'grid';

  container.innerHTML = folders.map((f) => `
    <div class="folder-card" ondblclick="window.__nksv.navigate('${f.id}')">
      <div class="folder-icon">📁</div>
      <div class="folder-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
      <div class="folder-actions">
        <button class="btn-sm" onclick="event.stopPropagation();window.__nksv.renameFolder('${f.id}','${escapeHtml(f.name)}')">Rename</button>
        <button class="btn-sm danger" onclick="event.stopPropagation();window.__nksv.deleteFolder('${f.id}','${escapeHtml(f.name)}')">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.folder-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.folder-actions')) return;
      const id = card.querySelector('[onclick]').getAttribute('onclick').match(/'([^']+)'/)[1];
      window.__nksv.navigate(id);
    });
  });
}

function renderFiles(files) {
  const container = document.getElementById('file-list');

  if (!files.length) {
    if (!document.getElementById('folder-grid').innerHTML) {
      container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:2rem">Empty folder</p>';
    } else {
      container.innerHTML = '';
    }
    return;
  }

  container.innerHTML = files.map((f) => {
    let thumb;
    if (isImage(f.mimeType)) {
      thumb = `<img class="file-thumb" src="/r/${f.id}" alt="">`;
    } else if (isVideo(f.mimeType)) {
      thumb = `<div class="file-thumb placeholder">▶</div>`;
    } else {
      thumb = `<div class="file-thumb placeholder">📄</div>`;
    }

    return `
      <div class="file-item">
        ${thumb}
        <div class="file-info">
          <div class="file-name">${escapeHtml(f.originalName)}</div>
          <div class="file-meta">${formatSize(f.size)} · ${formatDate(f.uploadedAt)}</div>
        </div>
        <div class="file-actions">
          <button class="btn-sm" onclick="window.__nksv.copyLink('${f.id}', this)">Copy link</button>
          <button class="btn-sm" onclick="window.open('/v/${f.id}','_blank')">Open</button>
          <button class="btn-sm danger" onclick="window.__nksv.deleteFile('${f.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.__nksv = {
  navigate(folderId) {
    setFolderId(folderId);
    loadFiles();
  },

  async copyLink(id, btn) {
    const url = location.origin + '/v/' + id;
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy link';
        btn.classList.remove('copied');
      }, 1500);
    } catch {
      window.prompt('Copy this:', url);
    }
  },

  async deleteFile(id) {
    if (!confirm('Delete this file?')) return;
    const ok = await api.deleteFile(id);
    if (ok) { showToast('Deleted'); loadFiles(); }
    else showToast('Delete failed');
  },

  async deleteFolder(id, name) {
    if (!confirm(`Delete folder "${name}" and all contents?`)) return;
    try {
      await api.deleteFolder(id);
      showToast('Folder deleted');
      loadFiles();
    } catch {
      showToast('Delete failed');
    }
  },

  async renameFolder(id, currentName) {
    const name = prompt('New folder name:', currentName);
    if (!name?.trim()) return;
    try {
      await api.renameFolder(id, name.trim());
      loadFiles();
    } catch {
      showToast('Rename failed');
    }
  },
};
