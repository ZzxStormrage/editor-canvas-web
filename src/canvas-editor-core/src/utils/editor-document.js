import { EditorError } from '../errors/editor-error.js';
import { isProductionFileAreaLabel } from './production-area.js';

export const EDITOR_DOCUMENT_VERSION = 1;
export const DOCUMENT_NODE_SOURCE_KEY = '__canvasEditorDocumentSource';

const DOCUMENT_METADATA_KEYS = new Set([
  'attributes',
  'elementId',
  'fontUrl',
  'objectFit',
  'objectPosition',
  'sourceHeight',
  'sourceWidth'
]);

/**
 * 解析并校验统一编辑器文档。
 *
 * @param {string | Object} value JSON 字符串或普通对象。
 * @returns {Object} 无引用共享的文档副本。
 * @throws {EditorError} 文档结构无效时抛出。
 */
export function parseEditorDocument(value) {
  let document;

  try {
    document = typeof value === 'string' ? JSON.parse(value) : cloneSerializable(value);
  } catch (error) {
    throw new EditorError(error.message || 'Editor document JSON is invalid.', 'DOCUMENT_JSON_INVALID');
  }

  if (!document || document.version !== EDITOR_DOCUMENT_VERSION) {
    throw new EditorError(
      `Only editor document version=${EDITOR_DOCUMENT_VERSION} is supported.`,
      'DOCUMENT_VERSION_UNSUPPORTED'
    );
  }

  if (!isPositiveNumber(document.canvas?.width) || !isPositiveNumber(document.canvas?.height)) {
    throw new EditorError('Document canvas width and height must be positive.', 'DOCUMENT_CANVAS_INVALID');
  }

  if (!Array.isArray(document.elements)) {
    throw new EditorError('Document elements must be an array.', 'DOCUMENT_ELEMENTS_INVALID');
  }

  document.elements.forEach((element) => validateDocumentNode(element));
  return document;
}

/**
 * 将文档节点转换为 Leafer 官方 JSON 工厂可消费的数据。
 *
 * @param {Object[]} elements 文档节点。
 * @param {{ x: number, y: number }} artboardOrigin 画板在内容层中的原点。
 * @param {{
 *   interactive?: boolean,
 *   productionVisibility?: 'preserve' | 'hidden',
 *   deferHiddenImages?: boolean
 * }} [options={}] 加载选项。
 * @returns {Object[]} Leafer 节点数据。
 */
export function createLeaferDocumentNodes(elements, artboardOrigin, options = {}) {
  return elements.map((element) => createLeaferDocumentNode(element, artboardOrigin, options, true, true));
}

/**
 * 递归遍历文档节点与已创建的 Leafer 节点。
 *
 * @param {Object[]} documentNodes 文档节点。
 * @param {Object[]} runtimeNodes Leafer 节点。
 * @param {(documentNode: Object, runtimeNode: Object, context: { visible: boolean }) => void} visitor 节点访问器。
 * @param {boolean} [parentVisible=true] 父节点是否有效显示。
 * @returns {void}
 */
export function visitDocumentNodePairs(documentNodes, runtimeNodes, visitor, parentVisible = true) {
  documentNodes.forEach((documentNode, index) => {
    const runtimeNode = runtimeNodes[index];

    if (!runtimeNode) {
      throw new EditorError(`Document node could not be created: ${documentNode.tag}`, 'DOCUMENT_NODE_CREATE_FAILED');
    }

    const visible = parentVisible && documentNode.visible !== false;
    visitor(documentNode, runtimeNode, { visible });
    visitDocumentNodePairs(documentNode.children ?? [], runtimeNode.children ?? [], visitor, visible);
  });
}

/**
 * 递归读取文档中的图片 URL。
 *
 * @param {Object[]} elements 文档节点。
 * @param {{ visibleOnly?: boolean }} [options={}] 收集选项。
 * @returns {string[]} 去重后的图片 URL。
 */
export function collectDocumentImageUrls(elements, options = {}) {
  const urls = new Set();

  visitDocumentNodes(elements, (element, context) => {
    if (
      isImageDocumentNode(element)
      && typeof element.url === 'string'
      && (!options.visibleOnly || context.visible)
    ) {
      urls.add(element.url);
    }
  });

  return [...urls];
}

/**
 * 克隆可 JSON 序列化的数据。
 *
 * @param {*} value 原始值。
 * @returns {*} 深拷贝结果。
 */
export function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 读取节点中不由 Leafer 稳定序列化的源字段。
 *
 * @param {Object} element 文档节点。
 * @returns {Object} 节点源字段副本。
 */
export function getDocumentNodeSource(element) {
  const source = cloneSerializable(element);
  delete source.children;
  return source;
}

/**
 * 移除文档元数据，保留 Leafer 渲染字段。
 *
 * @private
 * @param {Object} element 文档节点。
 * @param {{ x: number, y: number }} artboardOrigin 画板原点。
 * @param {Object} options 加载选项。
 * @param {boolean} isRoot 是否为顶层节点。
 * @param {boolean} parentVisible 父节点是否有效显示。
 * @returns {Object} Leafer JSON。
 */
function createLeaferDocumentNode(element, artboardOrigin, options, isRoot, parentVisible) {
  const node = {};
  const visible = parentVisible && element.visible !== false;

  Object.entries(element).forEach(([key, value]) => {
    if (key !== 'children' && !DOCUMENT_METADATA_KEYS.has(key)) {
      node[key] = cloneSerializable(value);
    }
  });

  if (isRoot) {
    node.x = Number(element.x ?? 0) + Number(artboardOrigin.x ?? 0);
    node.y = Number(element.y ?? 0) + Number(artboardOrigin.y ?? 0);
  }

  if (typeof options.interactive === 'boolean') {
    node.draggable = options.interactive;
    node.editable = options.interactive;
    node.hittable = options.interactive;
  }

  if (options.productionVisibility === 'hidden' && isProductionNode(element)) {
    node.visible = false;
  }

  if (options.deferHiddenImages && !visible && isImageDocumentNode(element)) {
    delete node.url;
    delete node.fill;
  }

  if (element.children?.length) {
    node.children = element.children.map((child) => {
      return createLeaferDocumentNode(child, artboardOrigin, options, false, visible);
    });
  }

  return node;
}

/**
 * 递归遍历文档节点。
 *
 * @private
 * @param {Object[]} elements 文档节点。
 * @param {(element: Object, context: { visible: boolean }) => void} visitor 访问器。
 * @param {boolean} [parentVisible=true] 父节点是否有效显示。
 * @returns {void}
 */
function visitDocumentNodes(elements, visitor, parentVisible = true) {
  elements.forEach((element) => {
    const visible = parentVisible && element.visible !== false;
    visitor(element, { visible });
    visitDocumentNodes(element.children ?? [], visitor, visible);
  });
}

/** @private @param {Object} element 文档节点。 @returns {boolean} 是否为图片节点。 */
function isImageDocumentNode(element) {
  return String(element?.tag ?? '').toLowerCase().includes('image');
}

/** @private @param {Object} element 文档节点。 @returns {void} */
function validateDocumentNode(element) {
  if (!element || typeof element !== 'object' || Array.isArray(element)) {
    throw new EditorError('Every document element must be an object.', 'DOCUMENT_NODE_INVALID');
  }

  if (typeof element.tag !== 'string' || !element.tag.trim()) {
    throw new EditorError('Every document element requires a tag.', 'DOCUMENT_NODE_TAG_REQUIRED');
  }

  if (element.children !== undefined && !Array.isArray(element.children)) {
    throw new EditorError('Document node children must be an array.', 'DOCUMENT_NODE_CHILDREN_INVALID');
  }

  if (element.fontUrl !== undefined && typeof element.fontUrl !== 'string') {
    throw new EditorError('Document text fontUrl must be a string.', 'DOCUMENT_FONT_URL_INVALID');
  }

  (element.children ?? []).forEach((child) => validateDocumentNode(child));
}

/** @private @param {Object} element 文档节点。 @returns {boolean} */
function isProductionNode(element) {
  const label = element.customType ?? element.name;
  return isProductionFileAreaLabel(label);
}

/** @private @param {*} value 待校验值。 @returns {boolean} */
function isPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}
