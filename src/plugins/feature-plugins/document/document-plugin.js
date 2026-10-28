import { Resource } from 'leafer-ui';

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
import { isSvgImageSource } from '../../../utils/image-runtime.js';

/**
 * 统一编辑器文档插件。
 *
 * 负责 JSON 校验、资源预加载、Leafer 官方反序列化、元素元数据恢复和无损导出。
 * 外部调用方应通过文档 API 恢复场景，不应自行创建节点代替反序列化流程。
 *
 * ⚠️ 新增元素属性时，必须同时完成以下 5 步，漏一步会导致静默丢数据
 * （历史撤销、本地草稿、导入导出都依赖这条链路）：
 *   1. 插件实现 `restoreDocumentState(target, source)` 恢复运行时状态；
 *   2. 插件提供 `getXxx(target)` 读取器，并在本文件 `_serializeNode` 中调用；
 *   3. `utils/editor-document.js` 的 `DOCUMENT_METADATA_KEYS` 加入该键，
 *      否则它会被当作 Leafer 渲染属性透传给节点构造函数；
 *   4. `parseEditorDocument` 的 `validateDocumentNode` 补校验（非法值应抛
 *      `DOCUMENT_*_INVALID`）；
 *   5. 补 round-trip 测试（参考 `tests/image-crop-document.test.js`）。
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
    return ['elementData', 'image', 'text'];
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
   * 默认保留文档内的交互和锁定状态，调用方可以按展示需求覆盖。
   *
   * @param {string | Object} value JSON 字符串或文档对象。
   * @param {{
   *   interactive?: boolean,
   *   deferHiddenImages?: boolean
   * }} [options={}] 加载选项。
   * @returns {Promise<Object>} 已加载的规范化文档副本。
   * @throws {EditorError} 文档或图片资源无效时抛出。
   */
  async load(value, options = {}) {
    this._assertReady();
    const normalizedOptions = this._normalizeLoadOptions(options);
    const document = parseEditorDocument(value);
    const [imageResources] = await Promise.all([
      this._preloadImages(document.elements, normalizedOptions),
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

    // 3. 恢复 Leafer JSON 不负责的稳定 ID、自定义属性和插件运行时标记。
    visitDocumentNodePairs(document.elements, contentLayer.children ?? [], (source, target, nodeContext) => {
      this._restoreNodeState(
        source,
        target,
        imageResources.get(source.url),
        { deferResource: options.deferHiddenImages && !nodeContext.visible }
      );
    });

    artboard?.syncWorkspaceBounds?.();
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
   * @param {{ deferResource?: boolean }} [options={}] 图片恢复选项。
   * @returns {void}
   */
  _restoreNodeState(source, target, imageResource, options = {}) {
    const container = getElementDataContainer(target, true);
    container.elementId = this._normalizeElementId(source.elementId, container.elementId);
    container.attributes = normalizeElementAttributes(source.attributes ?? {});
    target[DOCUMENT_NODE_SOURCE_KEY] = getDocumentNodeSource(source);

    const pluginManager = this._context.pluginManager;
    pluginManager?.get('image')?.restoreDocumentState?.(target, source, imageResource, options);
    pluginManager?.get('text')?.restoreDocumentState?.(target, source);
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
    this._context.pluginManager?.get('text')?.sanitizeDocumentData?.(element, renderData);
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

    const imagePlugin = this._context.pluginManager?.get('image');
    const imageSource = imagePlugin?.getSource?.(element);
    const fit = imagePlugin?.getFit?.(element);
    const crop = imagePlugin?.getCropSettings?.(element);
    if (imageSource) {
      result.url = imageSource;
      if (!crop) delete result.fill;
    }
    if (fit) {
      result.objectFit = toCssObjectFit(fit);
      result.objectPosition = source.objectPosition ?? 'center center';
    }
    if (crop) {
      result.crop = crop;
    } else {
      delete result.crop;
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
   * @param {{ deferHiddenImages?: boolean }} options 加载选项。
   * @returns {Promise<Map<string, Object>>} URL 到图片资源的映射。
   */
  async _preloadImages(elements, options) {
    const urls = collectDocumentImageUrls(elements, {
      visibleOnly: options.deferHiddenImages === true
    });

    try {
      const svgUrls = urls.filter((url) => isSvgImageSource(url));
      const imageUrls = urls.filter((url) => !isSvgImageSource(url));
      const svgPlugin = this._context.pluginManager?.get('svgRasterCache');
      const [svgEntries, imageEntries] = await Promise.all([
        svgPlugin?.preloadSources?.(svgUrls) ?? this._loadImagesDirectly(svgUrls),
        this._loadImagesDirectly(imageUrls)
      ]);
      return new Map([...svgEntries, ...imageEntries]);
    } catch (error) {
      throw new EditorError(error.message || 'Document image preload failed.', 'DOCUMENT_IMAGE_LOAD_FAILED');
    }
  }

  /**
   * 使用原有 Leafer 加载链路预加载非 SVG 图片。
   *
   * @private
   * @param {string[]} urls 图片 URL 列表。
   * @returns {Promise<Map<string, Object>>} URL 到图片资源的映射。
   */
  async _loadImagesDirectly(urls) {
    const entries = await Promise.all(urls.map(async (url) => {
      return [url, await Resource.loadImage(url)];
    }));
    return new Map(entries);
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

    return {
      interactive: typeof options.interactive === 'boolean' ? options.interactive : undefined,
      deferHiddenImages: options.deferHiddenImages === true
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
