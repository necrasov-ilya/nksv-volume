import type { ClientEntry, ClientFileEntry, ClientFolderEntry, ClientArticleEntry, Breadcrumb } from '../types.js';

export type { ClientEntry, ClientFileEntry, ClientFolderEntry, ClientArticleEntry, Breadcrumb };

export type ItemAction =
  | 'select'
  | 'navigate'
  | 'copy'
  | 'move'
  | 'rename-file'
  | 'rename'
  | 'publish'
  | 'unpublish'
  | 'open'
  | 'delete';

export type NavigateCallback = (folderId: string | null) => void;

export interface ListState {
  items: Map<string, ClientEntry>;
  selectedId: string | null;
  movingItem: ClientFileEntry | null;
  navigate: NavigateCallback | null;
  reload(): Promise<void>;
}

export function createListState(reload: () => Promise<void>, navigate: NavigateCallback | null): ListState {
  return {
    items: new Map(),
    selectedId: null,
    movingItem: null,
    navigate,
    reload,
  };
}

export function firstSelectable(state: ListState): ClientEntry | undefined {
  for (const item of state.items.values()) {
    if (item.type !== 'folder') return item;
  }
  return state.items.values().next().value;
}

export function shareUrl(id: string): string {
  return `${location.origin}/v/${encodeURIComponent(id)}`;
}
