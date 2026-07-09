import type { MetaEntry } from '../types.js';
import { sortKey } from './itemKind.js';

const TYPE_RANK: Record<MetaEntry['type'], number> = {
  folder: 0,
  article: 1,
  file: 2,
};

export function compareSharedItems(a: MetaEntry, b: MetaEntry): number {
  if (a.type === b.type) return sortKey(a).localeCompare(sortKey(b), 'ru');
  return TYPE_RANK[a.type] - TYPE_RANK[b.type];
}
