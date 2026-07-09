export const EDITOR_PLACEHOLDER = 'Начните писать…';

export const DEFAULT_MARKDOWN_OPTIONS = {
  gfm: true,
  breaks: true,
} as const;

export const TOOLBAR_GAP = 10;
export const TOOLBAR_CANVAS_EDGE_GAP = 12;
export const TOOLBAR_ICON_SIZE = 15;
export const TOOLBAR_FALLBACK_HEIGHT = 44;

export const INLINE_MENU_GAP = 12;

export const INLINE_MENU_BREAKPOINTS = {
  mobile: 560,
  tablet: 820,
} as const;

export const INLINE_MENU_HEIGHTS = {
  mobile: 430,
  tablet: 250,
  desktop: 164,
} as const;

export const INLINE_MENU_ANCHOR_THRESHOLD_GAP_BEFORE = 8;
export const INLINE_MENU_ANCHOR_THRESHOLD_GAP_AFTER = 8;
export const INLINE_MENU_ANCHOR_THRESHOLD_MIDDLE_MAX = 14;
export const INLINE_MENU_ANCHOR_THRESHOLD_MIDDLE_HALF_GAP = 8;

export const COVER_ZOOM_MIN = 1;
export const COVER_ZOOM_MAX = 3;
export const COVER_ZOOM_STEP = 0.01;

export const MARKDOWN_PASTE = {
  MIN_SAMPLE_LENGTH: 2,
  HEADING_PATTERN: /^#{1,6}\s/mg,
  TABLE_ROW_PATTERN: /^\|.+\|$/mg,
  TABLE_ROW_MIN_MATCHES: 2,
  LIST_QUOTE_PATTERN: /(^|\n)([-*+]\s|\d+[.)]\s|>\s|[—–]\s)/m,
  CODE_FENCE_PATTERN: /^```/m,
  BOLD_PATTERN: /(\*\*|__)[^*_]+(\*\*|__)/,
  ITALIC_ASTERISK_PATTERN: /(?<!\*)\*[^*\n]+\*(?!\*)/,
  ITALIC_UNDERSCORE_PATTERN: /(?<![_])_[^_\n]+_(?!_)/,
  LINK_PATTERN: /\[.+]\(.+\)/,
  IMAGE_PATTERN: /!\[.*]\(.+\)/,
  HORIZONTAL_RULE_PATTERN: /^---+$/m,
  MIN_FALLBACK_BLOCK_LENGTH: 40,
  MIN_TABLE_ROWS: 2,
  BLOCK_SEPARATOR: /\n{2,}/,
  CRLF_PATTERN: /\r\n/g,
  PIPE_LEADING_PATTERN: /^\|/,
  PIPE_TRAILING_PATTERN: /\|$/,
  TABLE_SEPARATOR_PATTERN: /^\|[\s:|-]+\|$/,
  DEFAULT_PARAGRAPH_TYPE: 'paragraph',
  DEFAULT_TEXT_TYPE: 'text',
  DEFAULT_DOC_TYPE: 'doc',
  DEFAULT_COMPARE_TABLE_TYPE: 'compareTable',
  CONTENT_TYPE_MARKDOWN: 'markdown',
} as const;

export const MARKDOWN_PASTE_PRIORITY = 1000;
