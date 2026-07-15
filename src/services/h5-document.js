const H5_DOCUMENT_VERSION = 1;
const RADIANS_PER_DEGREE = Math.PI / 180;
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
    elements: await Promise.all(
      collectExportElements(editor.contentLayer?.children ?? []).map((item) => {
        return serializeH5Element(editor, bounds, item);
      })
    )
  };
}

/**
 * 递归展开组合节点，H5 文档仍输出可直接渲染的叶子元素列表。
 *
 * @param {Object[]} elements 当前层级元素。
 * @param {boolean} [nested=false] 是否位于组合内部。
 * @param {number} [parentOpacity=1] 父级累计透明度。
 * @returns {Array<{ element: Object, nested: boolean, opacity: number }>} 待导出的叶子元素。
 */
function collectExportElements(elements, nested = false, parentOpacity = 1) {
  return elements.flatMap((element) => {
    if (element?.__snapGuide) {
      return [];
    }

    const opacity = parentOpacity * Number(element.opacity ?? 1);
    if (element?.isBranch && element.children?.length) {
      return collectExportElements(element.children, true, opacity);
    }

    return [{ element, nested, opacity }];
  });
}

/**
 * 将单个 Leafer 叶子节点转换为 H5 DTO。
 *
 * @param {Object} editor Editor 外观实例。
 * @param {{ x: number, y: number }} artboardBounds 画板内容边界。
 * @param {{ element: Object, nested: boolean, opacity: number }} item 导出项。
 * @returns {Promise<Object>} H5 元素。
 */
async function serializeH5Element(editor, artboardBounds, item) {
  const { element, nested, opacity } = item;
  const data = element.toJSON?.() ?? {};
  const transform = nested ? resolveFlattenedTransform(element, editor.contentLayer) : data;

  delete data.children;

  return {
    ...data,
    ...transform,
    url: await normalizeImageUrl(data.url),
    x: Number(transform.x ?? element.x ?? 0) - artboardBounds.x,
    y: Number(transform.y ?? element.y ?? 0) - artboardBounds.y,
    opacity,
    elementId: editor.elementData?.getId?.(element),
    attributes: editor.elementData?.get?.(element) ?? {}
  };
}

/**
 * 获取组合子节点相对内容层的完整变换。
 *
 * @param {Object} element Leafer 叶子节点。
 * @param {Object} contentLayer 编辑器内容层。
 * @returns {Object} 可供 H5 CSS 使用的变换属性。
 */
function resolveFlattenedTransform(element, contentLayer) {
  const transform = element.getTransform?.(contentLayer);

  if (!transform) {
    return {};
  }

  const layout = decomposeTransform(transform);
  return {
    x: layout.x,
    y: layout.y,
    scaleX: layout.scaleX,
    scaleY: layout.scaleY,
    rotation: layout.rotation,
    skewX: layout.skewX,
    skewY: layout.skewY,
    origin: 'top left'
  };
}

/**
 * 将二维仿射矩阵分解为 H5 可消费的布局属性。
 *
 * 算法与 Leafer Matrix.getLayout() 的无 origin 分支保持一致，避免 H5 预览为了
 * 一个纯数学操作额外加载完整 Leafer 运行时。
 *
 * @param {{ a: number, b: number, c: number, d: number, e: number, f: number }} matrix
 * 二维仿射矩阵。
 * @returns {{
 *   x: number,
 *   y: number,
 *   scaleX: number,
 *   scaleY: number,
 *   rotation: number,
 *   skewX: number,
 *   skewY: number
 * }} 分解后的布局属性。
 */
function decomposeTransform(matrix) {
  const { a, b, c, d, e: x, f: y } = matrix;

  if (!b && !c) {
    return { x, y, scaleX: a, scaleY: d, rotation: 0, skewX: 0, skewY: 0 };
  }

  const determinant = a * d - b * c;
  let scaleX;
  let scaleY;
  let rotationRadians;

  if (c) {
    scaleX = Math.hypot(a, b);
    scaleY = scaleX ? determinant / scaleX : 0;
    const cosine = scaleX ? clampUnit(a / scaleX) : 0;
    rotationRadians = b > 0 ? Math.acos(cosine) : -Math.acos(cosine);
  } else {
    scaleY = Math.hypot(c, d);
    scaleX = scaleY ? determinant / scaleY : 0;
    const cosine = scaleY ? clampUnit(c / scaleY) : 0;
    rotationRadians = Math.PI / 2 - (d > 0 ? Math.acos(-cosine) : -Math.acos(cosine));
  }

  const rotationCosine = normalizeFloat(Math.cos(rotationRadians));
  const rotationSine = Math.sin(rotationRadians);
  const skewX = rotationCosine && scaleY
    ? normalizeFloat((c / scaleY + rotationSine) / rotationCosine / RADIANS_PER_DEGREE)
    : 0;
  const skewY = rotationCosine && scaleX
    ? normalizeFloat((b / scaleX - rotationSine) / rotationCosine / RADIANS_PER_DEGREE)
    : 0;

  return {
    x,
    y,
    scaleX: normalizeFloat(scaleX),
    scaleY: normalizeFloat(scaleY),
    rotation: normalizeFloat(rotationRadians / RADIANS_PER_DEGREE),
    skewX,
    skewY
  };
}

/**
 * 将浮点数限制在反余弦函数定义域内。
 *
 * @param {number} value 原始数值。
 * @returns {number} -1 到 1 之间的数值。
 */
function clampUnit(value) {
  return Math.min(1, Math.max(-1, value));
}

/**
 * 清理矩阵计算产生的极小浮点误差。
 *
 * @param {number} value 原始数值。
 * @returns {number} 归一化数值。
 */
function normalizeFloat(value) {
  return Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(10));
}

export function saveH5Document(document) {
  localStorage.setItem(H5_DOCUMENT_STORAGE_KEY, JSON.stringify(document));
}

export function applyH5Document(value) {
  const document = parseH5Document(value);
  saveH5Document(document);
  return document;
}

export function readH5Document() {
  try {
    const value = localStorage.getItem(H5_DOCUMENT_STORAGE_KEY);
    return value ? parseH5Document(value) : createSampleH5Document();
  } catch {
    return createSampleH5Document();
  }
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
