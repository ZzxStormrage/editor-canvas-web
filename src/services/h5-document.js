const H5_DOCUMENT_VERSION = 1;
export const H5_DOCUMENT_STORAGE_KEY = 'ele-editor:h5-document';

/**
 * 将编辑器运行时数据转换为与 Leafer 实例解耦的 H5 文档。
 * 元素坐标统一换算为画板左上角坐标，H5 页面可按设备宽度等比缩放。
 */
export async function exportH5Document(editor) {
  const bounds = editor?.artboard?.getContentBounds?.();

  if (!editor || !bounds) {
    throw new Error('编辑器尚未初始化，无法导出 H5 JSON。');
  }

  return {
    version: H5_DOCUMENT_VERSION,
    canvas: {
      width: bounds.width,
      height: bounds.height,
      background: editor.artboard?.options?.fill ?? '#ffffff'
    },
    elements: await Promise.all((editor.contentLayer?.children ?? []).map(async (element) => {
      const data = element.toJSON?.() ?? {};
      const businessData = editor.elementData?.get?.(element) ?? {};
      const elementId = editor.elementData?.getId?.(element);

      return {
        ...data,
        url: await normalizeImageUrl(data.url),
        x: Number(data.x ?? element.x ?? 0) - bounds.x,
        y: Number(data.y ?? element.y ?? 0) - bounds.y,
        elementId,
        attributes: businessData
      };
    }))
  };
}

export function saveH5Document(document) {
  localStorage.setItem(H5_DOCUMENT_STORAGE_KEY, JSON.stringify(document));
}

export function readH5Document() {
  const value = localStorage.getItem(H5_DOCUMENT_STORAGE_KEY);
  return value ? parseH5Document(value) : createSampleH5Document();
}

export function parseH5Document(value) {
  const document = typeof value === 'string' ? JSON.parse(value) : value;

  if (!document || document.version !== H5_DOCUMENT_VERSION) {
    throw new Error(`仅支持 version=${H5_DOCUMENT_VERSION} 的 H5 JSON。`);
  }
  if (!isPositiveNumber(document.canvas?.width) || !isPositiveNumber(document.canvas?.height)) {
    throw new Error('canvas.width 和 canvas.height 必须是正数。');
  }
  if (!Array.isArray(document.elements)) {
    throw new Error('elements 必须是数组。');
  }

  return document;
}

export function createSampleH5Document() {
  return {
    version: H5_DOCUMENT_VERSION,
    canvas: { width: 375, height: 667, background: '#ffffff' },
    elements: [
      {
        tag: 'Text',
        x: 28,
        y: 72,
        width: 319,
        text: '请从编辑器点击「H5 预览」\n或在下方粘贴 JSON 数据',
        fontSize: 24,
        fontWeight: 700,
        fill: '#1f2937',
        lineHeight: 34,
        textAlign: 'center',
        elementId: 'sample-title',
        attributes: {}
      }
    ]
  };
}

function isPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

async function normalizeImageUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('blob:')) return url;

  const response = await fetch(url);
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片转为 H5 JSON 失败。'));
    reader.readAsDataURL(blob);
  });
}
