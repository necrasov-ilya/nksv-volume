export const BLOCK_INSERT_LABELS = {
  paragraph: 'Абзац',
  heading: 'Заголовок',
  bulletList: 'Список',
  keyIdea: 'Ключевая мысль',
  definition: 'Определение',
  example: 'Пример',
  callout: 'Callout',
  examTrap: 'Ловушка',
  compareTable: 'Таблица',
} as const;

export const BLOCK_DEFAULT_TITLES = {
  example: 'Пример',
  callout: 'Важно',
} as const;

export const BLOCK_PROMPT_LABELS = {
  definitionTerm: 'Термин',
  exampleTitle: 'Название примера',
  calloutTitle: 'Название блока',
} as const;

export const STATUS_LABELS = {
  published: 'Опубликована',
  draft: 'Черновик',
} as const;

export const STATE_LABELS = {
  hasChanges: 'Есть изменения',
  saved: 'Сохранено',
} as const;

export const TOOLBAR_LABELS = {
  bold: 'Жирный',
  italic: 'Курсив',
  link: 'Ссылка',
  heading1: 'Заголовок 1',
  heading2: 'Заголовок 2',
  heading3: 'Заголовок 3',
  bulletList: 'Маркированный список',
  orderedList: 'Нумерованный список',
  blockquote: 'Цитата',
  linkPrompt: 'URL',
  toolbarLabel: 'Форматирование текста',
} as const;

export const EDITOR_LABELS = {
  addBlock: 'Добавить блок',
  loading: 'Загрузка редактора…',
} as const;

export const APP_LABELS = {
  articleIdMissing: 'Не указан id статьи',
  articleLoadError: 'Не удалось загрузить статью',
  articleNotFound: 'Статья не найдена',
  backToFiles: 'К файлам',
  editArticle: 'Редактирование статьи',
  saveConfirmLeave: 'Выйти без сохранения?',
  loading: 'Загрузка…',
} as const;

export const APP_TOASTS = {
  published: 'Статья опубликована',
  saved: 'Сохранено',
  linkCopied: 'Ссылка скопирована',
  linkCopyFailed: 'Не удалось скопировать ссылку',
} as const;

export const API_ERROR_MESSAGES = {
  requestFailed: 'Не удалось выполнить запрос',
  imageUploadFailed: 'Не удалось загрузить изображение',
  noServerConnection: 'Нет соединения с сервером',
} as const;

export const COVER_LABELS = {
  cropTitle: 'Обрезка обложки',
  cropDescription: 'Формат {ratio} · {size}. Перетащите и увеличьте фото, чтобы заполнить рамку.',
  zoom: 'Масштаб',
  cancel: 'Отмена',
  applyCrop: 'Применить обрезку',
  applying: 'Сохраняем…',
  chooseNew: 'Выбрать новую',
  reset: 'Сбросить',
  uploading: 'Загрузка…',
  upload: 'Загрузить',
  currentImage: 'Текущее изображение',
  notSelected: 'Не выбрано',
  selectFromUploads: 'Выбрать из загрузок',
  cover: 'Обложка',
  coverHint: 'Показывается в начале публичной статьи · {spec}',
  tagsPlaceholder: 'через запятую',
  title: 'Заголовок',
  annotation: 'Аннотация',
  tags: 'Теги',
  publish: 'Публикация',
  state: 'Состояние',
  id: 'ID',
  passport: 'Паспорт',
} as const;

export const CROP_ERROR_MESSAGES = {
  prepareFailed: 'Не удалось подготовить обрезку',
  cropFailed: 'Не удалось обрезать изображение',
} as const;
