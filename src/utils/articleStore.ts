import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { ArticleContent } from '../types.js';
import { emptyArticleContent } from './articleRender.js';
import { writeJsonAtomically } from './jsonFile.js';

fs.mkdirSync(config.paths.articles, { recursive: true });

function contentPath(id: string): string {
  return path.join(config.paths.articles, `${id}.json`);
}

export function loadArticleContent(id: string): ArticleContent | null {
  const filePath = contentPath(id);
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as ArticleContent).content)) {
      throw new Error('Article content root must contain a content array');
    }
    return parsed as ArticleContent;
  } catch (error) {
    throw new Error(`Unable to read article content ${id}`, { cause: error });
  }
}

export function saveArticleContent(id: string, content: ArticleContent): void {
  writeJsonAtomically(contentPath(id), content);
}

export function createArticleContentFile(id: string, content: ArticleContent = emptyArticleContent()): ArticleContent {
  saveArticleContent(id, content);
  return content;
}

export function deleteArticleContent(id: string): void {
  const filePath = contentPath(id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
