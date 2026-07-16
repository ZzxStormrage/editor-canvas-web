import { Platform } from 'leafer-ui';

import { EditorError } from '../../../errors/editor-error.js';
import { getElementDataContainer, normalizeElementAttributes } from '../../../utils/element-data.js';
import {
  DOCUMENT_NODE_SOURCE_KEY,
  cloneSerializable,
  collectDocumentImageUrls,
  createLeaferDocumentNodes,
  getDocumentNodeSource,
  parseEditorDocument,
  visitDocumentNodePairs
} from '../../../utils/editor-document.js';
import { loadDocumentFonts } from '../../../utils/font.js';
import { toCssObjectFit } from '../../../utils/image-fit.js';

/**
 * 统一编辑器文档插件。
 *
 * 负责 JSON 校验、资源预加载、Leafer 官方反序列化、业务元数据恢复和无损导出。
 * 页面与 Vue 组件不得自行创建场景节点。
 */
export class DocumentPlugin {
  constructor() {
    /** @private @type {Object | null} */
    this._context = null;
  }

  /** @returns {string} 插件 ID。 */
  get id() {
    return 'document';
  }

  /** @returns {string} 插件名称。 */
  get name() {
    return 'Document';
  }

  /** @returns {string[]} 插件依赖。 */
  get dependencies() {
    return ['elementData', 'image', 'text', 'production'];
  }

  /**
   * 初始化插件。
   *
   * @param {Object} context 编辑器上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this._context = context;
  }

  /**
   * 加载统一编辑器文档。
   *
   * 默认保留文档内的交互、锁定和生产标记状态，调用方可以按页面需求覆盖。
   *
   * @param {string | Object} value JSON 字符串或文档对象。
   * @param {{ interactive?: boolean, productionVisibility?: 'preserve' | 'hidden' }} [options={}] 加载选项。
   * @returns {Promise<Object>} 已加载的规范化文档副本。
   * @throws {EditorError} 文档或图片资源无效时抛出。
   */
  async load(value, options = {}) {
    this._assertReady();
    const normalizedOptions = this._normalizeLoadOptions(options);
    const document = parseEditorDocument(value);
    const [imageResources] = await Promise.all([
      this._preloadImages(document.elements),
      this._preloadFonts(document.elements)
    ]);

    this._applyDocument(document, normalizedOptions, imageResources);
    this._context.eventBus.emit('document:loaded', { document: cloneSerializable(document) });
    return cloneSerializable(document);
  }

  /**
   * 导出当前编辑器的统一文档。
   *
   * @returns {Object} 可重新无损加载的文档。
   */
  export() {
    this._assertReady();
    const artboard = this._context.artboard?.getContentBounds?.() ?? { x: 0, y: 0 };
    const elements = (this._context.contentLayer.children ?? []).map((element) => {
      return this._serializeNode(element, artboard, true);
    });
    const document = {
      version: 1,
      canvas: {
        width: artboard.width,
        height: artboard.height,
        background: this._context.artboard?.options?.fill ?? '#ffffff'
      },
      elements
    };

    this._context.eventBus.emit('document:exported', { document: cloneSerializable(document) });
    return document;
  }

  /**
   * 清空当前文档内容，保留编辑器实例和画板。
   *
   * @returns {void}
   */
  clear() {
    this._assertReady();
    this._context.innerEditor?.cancel?.();
    this._context.contentLayer.clear();
    this._context.artboard?.syncAllElements?.();
    this._context.eventBus.emit('document:cleared', {});
  }

  /** 清理插件引用。 @returns {void} */
  destroy() {
    this._context = null;
  }

  /**
   * 应用已校验文档。
   *
   * @private
   * @param {Object} document 文档对象。
   * @param {Object} options 加载选项。
   * @param {Map<string, Object>} imageResources 图片资源信息。
   * @returns {void}
   */
  _applyDocument(document, options, imageResources) {
    const { artboard, contentLayer, innerEditor } = this._context;

    // 1. 先同步画板，确保顶层坐标可以映射到最终画板原点。
    artboard?.resize?.(document.canvas.width, document.canvas.height);
    artboard?.setFill?.(document.canvas.background ?? '#ffffff');
    const artboardBounds = artboard?.getContentBounds?.() ?? { x: 0, y: 0 };
    const leaferNodes = createLeaferDocumentNodes(document.elements, artboardBounds, options);

    // 2. 一次性替换场景树，避免旧文档和新文档同时出现。
    innerEditor?.cancel?.();
    contentLayer.clear();
    contentLayer.add(leaferNodes);

    // 3. 恢复 Leafer JSON 不负责的稳定 ID、业务属性和插件运行时标记。
    visitDocumentNodePairs(document.elements, contentLayer.children ?? [], (source, target) => {
      this._restoreNodeState(source, target, imageResources.get(source.url));
    });

    artboard?.syncAllElements?.();
    innerEditor?.update?.();
  }

  /**
   * 恢复单个节点的编辑器元数据。
   *
   * @private
   * @param {Object} source 文档节点。
   * @param {Object} target Leafer 节点。
   * @param {Object | undefined} imageResource 图片资源。
   * @returns {void}
   */
  _restoreNodeState(source, target, imageResource) {
    const container = getElementDataContainer(target, true);
    container.elementId = this._normalizeElementId(source.elementId, container.elementId);
    container.attributes = normalizeElementAttributes(source.attributes ?? {});
    target[DOCUMENT_NODE_SOURCE_KEY] = getDocumentNodeSource(source);

    const pluginManager = this._context.pluginManager;
    pluginManager?.get('image')?.restoreDocumentState?.(target, source, imageResource);
    pluginManager?.get('text')?.restoreDocumentState?.(target, source);
    pluginManager?.get('production')?.restoreDocumentState?.(target, source);
  }

  /**
   * 序列化单个节点。
   *
   * @private
   * @param {Object} element Leafer 节点。
   * @param {{ x: number, y: number }} artboard 画板边界。
   * @param {boolean} isRoot 是否为顶层节点。
   * @returns {Object} 文档节点。
   */
  _serializeNode(element, artboard, isRoot) {
    const source = cloneSerializable(element[DOCUMENT_NODE_SOURCE_KEY] ?? {});
    const renderData = element.toJSON?.() ?? {};
    delete renderData.children;
    const container = getElementDataContainer(element, true);
    const result = {
      ...source,
      ...renderData,
      elementId: container.elementId,
      attributes: normalizeElementAttributes(container.attributes)
    };

    if (isRoot) {
      result.x = Number(renderData.x ?? element.x ?? 0) - Number(artboard.x ?? 0);
      result.y = Number(renderData.y ?? element.y ?? 0) - Number(artboard.y ?? 0);
    }

    const fit = this._context.pluginManager?.get('image')?.getFit?.(element);
    if (fit) {
      result.objectFit = toCssObjectFit(fit);
      result.objectPosition = source.objectPosition ?? 'center center';
    }

    const fontUrl = this._context.pluginManager?.get('text')?.getFontUrl?.(element);
    if (fontUrl) {
      result.fontUrl = fontUrl;
    } else {
      delete result.fontUrl;
    }

    if (element.children?.length) {
      result.children = element.children.map((child) => this._serializeNode(child, artboard, false));
    } else {
      delete result.children;
    }

    return result;
  }

  /**
   * 预加载文档图片，加载失败时不修改当前场景。
   *
   * @private
   * @param {Object[]} elements 文档节点。
   * @returns {Promise<Map<string, Object>>} URL 到图片资源的映射。
   */
  async _preloadImages(elements) {
    const urls = collectDocumentImageUrls(elements);

    try {
      const entries = await Promise.all(urls.map(async (url) => [url, await Platform.origin.loadImage(url)]));
      return new Map(entries);
    } catch (error) {
      throw new EditorError(error.message || 'Document image preload failed.', 'DOCUMENT_IMAGE_LOAD_FAILED');
    }
  }

  /**
   * 预加载文档字体，确保创建 Text 节点时字体已经注册。
   *
   * @private
   * @param {Object[]} elements 文档节点。
   * @returns {Promise<void>} 字体预加载完成。
   */
  async _preloadFonts(elements) {
    try {
      await loadDocumentFonts(elements);
    } catch (error) {
      throw new EditorError(error.message || 'Document font preload failed.', 'DOCUMENT_FONT_LOAD_FAILED');
    }
  }

  /** @private @param {Object} options 加载选项。 @returns {Object} 规范化选项。 */
  _normalizeLoadOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new EditorError('Document load options must be an object.', 'DOCUMENT_OPTIONS_INVALID');
    }

    const productionVisibility = options.productionVisibility ?? 'preserve';
    if (!['preserve', 'hidden'].includes(productionVisibility)) {
      throw new EditorError(
        'productionVisibility must be preserve or hidden.',
        'DOCUMENT_PRODUCTION_VISIBILITY_INVALID'
      );
    }

    return {
      interactive: typeof options.interactive === 'boolean' ? options.interactive : undefined,
      productionVisibility
    };
  }

  /** @private @param {*} elementId 输入 ID。 @param {string} fallback 回退 ID。 @returns {string} ID。 */
  _normalizeElementId(elementId, fallback) {
    return typeof elementId === 'string' && elementId.trim() ? elementId.trim() : fallback;
  }

  /** @private @returns {void} */
  _assertReady() {
    if (!this._context?.contentLayer?.add || this._context.state?.destroyed) {
      throw new EditorError('DocumentPlugin is not ready.', 'DOCUMENT_PLUGIN_NOT_READY');
    }
  }
}
