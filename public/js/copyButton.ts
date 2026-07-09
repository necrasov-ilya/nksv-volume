import { COPY_FEEDBACK_DURATION_MS, PUBLIC_COPY_FEEDBACK_DURATION_MS } from './constants/ui.js';
import { escapeHtml } from './html.js';

interface CopyButtonOptions {
  durationMs?: number;
  copiedLabel?: string;
  idleLabel?: string;
  iconClass?: string;
  copiedIconClass?: string;
  promptFallback?: string;
  onCopied?: () => void;
}

const ACTIVE_CLASS = 'copied';

export interface MountedCopyButton {
  element: HTMLButtonElement;
  destroy(): void;
}

export function mountCopyButton(
  container: HTMLElement,
  options: CopyButtonOptions = {},
): MountedCopyButton {
  const duration = options.durationMs ?? COPY_FEEDBACK_DURATION_MS;
  const idleLabel = options.idleLabel ?? 'Скопировать';
  const copiedLabel = options.copiedLabel ?? 'Скопировано';
  const iconClass = options.iconClass ?? 'ti-copy';
  const copiedIconClass = options.copiedIconClass ?? 'ti-check';
  const promptFallback = options.promptFallback ?? 'Скопируйте ссылку:';

  const button = document.createElement('button');
  button.className = 'primary-button copy-feedback-button';
  button.type = 'button';
  button.setAttribute('aria-label', idleLabel);
  button.innerHTML = `
    <i class="ti ${iconClass}" aria-hidden="true"></i>
    <span class="copy-feedback-button__label">${escapeHtml(idleLabel)}</span>
  `;

  let timer: ReturnType<typeof setTimeout> | null = null;

  async function handleClick(): Promise<void> {
    const value = container.dataset.copyValue ?? location.href;
    try {
      await navigator.clipboard.writeText(value);
      button.classList.add(ACTIVE_CLASS);
      button.innerHTML = `
        <i class="ti ${copiedIconClass}" aria-hidden="true"></i>
        <span class="copy-feedback-button__label">${escapeHtml(copiedLabel)}</span>
      `;
      options.onCopied?.();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        button.classList.remove(ACTIVE_CLASS);
        button.innerHTML = `
          <i class="ti ${iconClass}" aria-hidden="true"></i>
          <span class="copy-feedback-button__label">${escapeHtml(idleLabel)}</span>
        `;
      }, duration);
    } catch {
      window.prompt(promptFallback, value);
    }
  }

  button.addEventListener('click', handleClick);
  container.appendChild(button);

  return {
    element: button,
    destroy() {
      if (timer) clearTimeout(timer);
      button.removeEventListener('click', handleClick);
      button.remove();
    },
  };
}

export const DEFAULT_PUBLIC_DURATION = PUBLIC_COPY_FEEDBACK_DURATION_MS;

export const copyButton = mountCopyButton;
