export const strings = {
  app: {
    titleSuffix: 'volume',
  },

  common: {
    separator: ' · ',
    storageFormat: (used: string, limit: string): string => `${used} из ${limit}`,
  },

  units: {
    bytes: 'Б',
    kb: 'КБ',
    mb: 'МБ',
    gb: 'ГБ',
  },

  date: {
    todayPrefix: 'сегодня, ',
  },

  itemKinds: {
    folder: 'Папка',
    article: 'Статья',
    file: 'Файл',
  },

  auth: {
    defaultError: 'Не удалось выполнить запрос',
    uploadFailed: 'Не удалось загрузить файл',
    connectionError: 'Нет соединения с сервером',
  },

  admin: {
    folderCreated: 'Папка создана',
    articleCreated: 'Статья создана',
    defaultArticleTitle: 'Без названия',
  },

  landing: {
    sessionExpired: 'Сессия завершилась. Войдите снова.',
    loggedOut: 'Вы вышли',
  },

  upload: {
    uploading: 'Загрузка…',
    unsupportedFormat: (name: string): string => `Формат «${name}» не поддерживается`,
    tooLarge: (name: string, maxMb: number): string => `«${name}» больше ${maxMb} МБ`,
    filesCountLabel: (count: number): string => `Файлов: ${count}`,
    fileUploaded: 'Файл загружен',
    filesUploaded: (count: number): string => `Загружено файлов: ${count}`,
    limitsLabel: (maxMb: number): string =>
      `PNG, JPG, WebP, GIF, PDF, MP4, WebM, MKV · до ${maxMb} МБ`,
  },

  fileList: {
    todayFallback: 'Сегодня',
    articleStatus: {
      published: 'Опубликована',
      draft: 'Черновик',
    },
    copy: {
      copied: 'Скопировано',
      linkCopied: 'Ссылка скопирована',
      copyPrompt: 'Скопируйте ссылку:',
      rowAriaLabel: 'Скопировать публичную ссылку',
    },
    breadcrumbs: {
      upAriaLabel: 'На уровень выше',
      upLabel: 'Назад',
      allFiles: 'Все файлы',
    },
    menu: {
      openFolder: 'Открыть папку',
      openFile: 'Открыть файл',
      edit: 'Редактировать',
      move: 'Переместить',
      rename: 'Переименовать',
      publish: 'Опубликовать',
      unpublishAriaLabel: 'Снять с публикации',
      unpublishLabel: 'В черновик',
      moreActionsAriaLabel: 'Другие действия',
      delete: 'Удалить',
    },
    emptyState: {
      title: 'Здесь пока пусто',
      lead: 'Перетащите файлы, вставьте из буфера (Ctrl+V) или нажмите «Добавить»',
    },
    moveDialog: {
      allFilesOption: 'Все файлы',
      alreadyThere: 'Файл уже находится в этой папке',
      moved: 'Файл перемещён',
    },
    detail: {
      empty: 'Выберите элемент, чтобы посмотреть его и скопировать ссылку.',
      publicLinkLabel: 'Публичная ссылка',
      copyLink: 'Скопировать ссылку',
      open: 'Открыть',
    },
    renamePrompts: {
      file: 'Новое имя файла:',
      folder: 'Новое название папки:',
    },
    toasts: {
      fileRenamed: 'Файл переименован',
      articlePublished: 'Статья опубликована',
      articleUnpublished: 'Статья снята с публикации',
      deleted: 'Удалено',
    },
    deleteConfirm: {
      folder: (name: string): string => `Удалить папку «${name}» вместе с содержимым?`,
      article: (title: string): string => `Удалить статью «${title}»?`,
      file: (name: string): string => `Удалить файл «${name}»?`,
    },
  },

  viewer: {
    unavailable: {
      title: 'Ничего не отправили',
      hello: 'Привет!',
      message:
        'Тебе пока ничего не отправили. Возможно, ссылка устарела или в ней есть ошибка.',
    },
    copy: {
      copyLink: 'Скопировать ссылку',
      copied: 'Скопировано',
      linkCopied: 'Ссылка скопирована',
      copyPrompt: 'Скопируйте ссылку:',
    },
    download: 'Скачать файл',
    articleLabel: 'Статья',
    folder: {
      sharedFolder: 'Общая папка',
      empty: 'В этой папке пока пусто',
      openAriaLabelPrefix: 'Открыть ',
    },
  },
} as const;

export function pluralObjects(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} объект`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${count} объекта`;
  return `${count} объектов`;
}

export function pluralFilesUploaded(count: number): string {
  return count === 1 ? strings.upload.fileUploaded : strings.upload.filesUploaded(count);
}
