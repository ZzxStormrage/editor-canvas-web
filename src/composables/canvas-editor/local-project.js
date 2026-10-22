const DATABASE_NAME = 'canvas-editor-local';
const STORE_NAME = 'projects';
const DRAFT_KEY = 'recovery-draft';

/** @returns {Promise<IDBDatabase>} Open the local project database. */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('此浏览器不支持本地草稿。请导出项目文件保存修改。'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地草稿空间。'));
  });
}

/**
 * Store a document as the recoverable local draft.
 * @param {Object} document Serializable editor document.
 * @returns {Promise<void>} Completed write.
 */
export async function saveLocalDraft(document) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({
        document,
        updatedAt: Date.now()
      }, DRAFT_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/**
 * Read the last recoverable draft.
 * @returns {Promise<{document: Object, updatedAt: number} | null>} Saved draft.
 */
export async function loadLocalDraft() {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME).get(DRAFT_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

/**
 * Export the artboard at the requested pixel ratio.
 * @param {Object} editor Active editor instance.
 * @param {string} format Output format.
 * @param {number} pixelRatio Raster scale.
 * @returns {Promise<string>} Image data URL.
 */
export async function exportArtboardImage(editor, format = 'png', pixelRatio = 2) {
  if (!['png', 'jpg'].includes(format)) {
    throw new TypeError('请选择 PNG 或 JPG 格式。');
  }
  const bounds = editor.artboard.getContentBounds();
  const result = await editor.contentLayer.export(format, {
    relative: 'page',
    clip: bounds,
    pixelRatio,
    fill: format === 'jpg' ? '#ffffff' : undefined
  });
  if (result.error || typeof result.data !== 'string') {
    throw result.error ?? new Error('图片导出失败，请降低导出倍率后重试。');
  }
  return result.data;
}

/** @param {string} dataUrl Encoded image. @param {string} format File extension. @returns {void} Download image. */
export function downloadImage(dataUrl, format) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `canvas-artboard.${format}`;
  link.click();
}
