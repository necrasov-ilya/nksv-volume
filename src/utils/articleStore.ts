import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { ArticleContent } from '../types.js';
import { emptyArticleContent } from './articleRender.js';

fs.mkdirSync(config.paths.articles, { recursive: true });

function contentPath(id: string): string {
  return path.join(config.paths.articles, `${id}.json`);
}

export function loadArticleContent(id: string): ArticleContent | null {
  const filePath = contentPath(id);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ArticleContent;
  } catch {
    return null;
  }
}

export function saveArticleContent(id: string, content: ArticleContent): void {
  fs.writeFileSync(contentPath(id), JSON.stringify(content, null, 2));
}

export function createArticleContentFile(id: string, content: ArticleContent = emptyArticleContent()): ArticleContent {
  saveArticleContent(id, content);
  return content;
}

export function deleteArticleContent(id: string): void {
  const filePath = contentPath(id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}