import { SHARE_ROUTE } from '../constants/api.js';

export function articleShareUrl(articleId: string): string {
  return `${window.location.origin}${SHARE_ROUTE(articleId)}`;
}

export async function copyArticleShareLink(articleId: string): Promise<boolean> {
  const url = articleShareUrl(articleId);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(input);
      return copied;
    } catch {
      return false;
    }
  }
}