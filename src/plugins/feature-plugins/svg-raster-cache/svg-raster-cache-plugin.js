import { ChildEvent, Resource } from 'leafer-ui';

import {
  IMAGE_SOURCE_FORMAT_KEY,
  IMAGE_SOURCE_URL_KEY,
  SVG_RUNTIME_CACHE_URL_KEY,
  isSvgImageSource
} from '../../../utils/image-runtime.js';
import { SvgRasterCache } from './svg-raster-cache.js';

const RASTER_REFRESH_DELAY = 160;

/**
 * SVG 运行时栅格缓存插件。
 *
 * 插件只替换画布实时渲染资源，原 SVG URL 仍保存在图片元数据中，
 * 不改变 JSON、图层、自定义属性和文档导出流程。
 */
export class SvgRasterCachePlugin {
  #assignments = new Map();
  #cache;
  #context = null;
  #eventBindings = [];
  #hiddenVisibility = new WeakMap();
  #refreshTimer = null;
  #unsubscribeEvents = [];
  #versions = new WeakMap();

  /** @param {Object} [options={}] SVG 缓存选项。 */
  constructor(options = {}) {
    this.#cache = new SvgRasterCache({
      ...options,
      resource: options.resource ?? createLeaferResourceAdapter()
    });
  }

  /** @returns {string} 插件 ID。 */
  get id() {
    return 'svgRasterCache';
  }

  /** @returns {string} 插件名称。 */
  get name() {
    return 'SVG Raster Cache';
  }

  /** @returns {string[]} 依赖插件。 */
  get dependencies() {
    return ['image'];
  }

  /**
   * 监听 SVG 节点、图片替换和缩放结束事件。
   *
   * @param {Object} context 编辑器插件上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this.#context = context;
    this.#eventBindings = [
      {
        target: context.contentLayer,
        eventId: context.contentLayer.on_(ChildEvent.ADD, this.#handleNodeAdded, this)
      },
      {
        target: context.contentLayer,
        eventId: context.contentLayer.on_(ChildEvent.REMOVE, this.#handleNodeRemoved, this)
      }
    ];
    this.#unsubscribeEvents = [
      context.eventBus.on('image:replaced', ({ image }) => this.#handleImageChanged(image, true)),
      context.eventBus.on('image:source-activated', ({ image }) => this.#handleImageChanged(image, true)),
      context.eventBus.on('image:selection-changed', ({ image }) => this.#scheduleNode(image)),
      context.eventBus.on('selection:duplicated', ({ pairs }) => {
        (pairs ?? []).forEach(({ clone }) => this.#handleImageChanged(clone, false));
      }),
      context.eventBus.on('viewport:transform-end', () => this.#scheduleAllNodes())
    ];
    this.#visitNodes(context.contentLayer.children, (node) => {
      this.#handleImageChanged(node, true);
    });
  }

  /**
   * 预加载 SVG 源资源，供文档导入阶段复用解析结果。
   *
   * @param {string[]} sources SVG 原始资源列表。
   * @returns {Promise<Map<string, Object>>} URL 到图片资源的映射。
   */
  async preloadSources(sources) {
    return await this.#cache.preload(sources);
  }

  /**
   * 为离屏导出副本恢复原 SVG，避免生产截图使用屏幕级栅格缓存放大。
   *
   * @param {Object} sourceNode 原画布节点。
   * @param {Object} cloneNode 离屏导出副本。
   * @returns {Object} 原离屏副本。
   */
  restoreCloneSource(sourceNode, cloneNode) {
    const source = this.#getSource(sourceNode);
    if (!cloneNode || !isSvgImageSource(source, sourceNode?.[IMAGE_SOURCE_FORMAT_KEY])) {
      return cloneNode;
    }

    const paint = this.#getImagePaint(sourceNode);
    cloneNode.set?.({ url: undefined });
    cloneNode.set?.({
      fill: {
        align: paint?.align ?? 'center',
        mode: paint?.mode ?? 'stretch',
        type: 'image',
        url: source
      }
    });
    cloneNode[IMAGE_SOURCE_URL_KEY] = source;
    cloneNode[IMAGE_SOURCE_FORMAT_KEY] = 'svg';
    delete cloneNode[SVG_RUNTIME_CACHE_URL_KEY];
    return cloneNode;
  }

  /** 清理事件、任务和栅格资源。 @returns {void} */
  destroy() {
    if (this.#refreshTimer) {
      clearTimeout(this.#refreshTimer);
      this.#refreshTimer = null;
    }
    this.#eventBindings.forEach(({ eventId, target }) => target.off_(eventId));
    this.#unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.#assignments.forEach((entry) => this.#cache.release(entry));
    this.#eventBindings = [];
    this.#unsubscribeEvents = [];
    this.#assignments.clear();
    this.#cache.destroy();
    this.#context = null;
  }

  /** @private @param {ChildEvent} event 节点新增事件。 @returns {void} */
  #handleNodeAdded(event) {
    this.#visitNodes([event.child], (node) => {
      this.#handleImageChanged(node, true);
    });
  }

  /** @private @param {ChildEvent} event 节点移除事件。 @returns {void} */
  #handleNodeRemoved(event) {
    this.#visitNodes([event.child], (node) => {
      this.#releaseNode(node);
    });
  }

  /** @private @param {Object} node 图片节点。 @param {boolean} hideUntilReady 是否在首次栅格化时隐藏。 @returns {void} */
  #handleImageChanged(node, hideUntilReady) {
    if (!this.#isImageNode(node)) {
      return;
    }

    const source = this.#getSource(node);
    if (!isSvgImageSource(source, node[IMAGE_SOURCE_FORMAT_KEY])) {
      this.#releaseNode(node);
      return;
    }

    node[IMAGE_SOURCE_URL_KEY] = source;
    node[IMAGE_SOURCE_FORMAT_KEY] = 'svg';
    void this.#optimizeNode(node, hideUntilReady);
  }

  /** @private @param {Object} node 图片节点。 @returns {Promise<void>} */
  async #optimizeNode(node, hideUntilReady) {
    const source = this.#getSource(node);
    const version = (this.#versions.get(node) ?? 0) + 1;
    const previousEntry = this.#assignments.get(node);
    const wasVisible = node.visible !== false;
    const shouldRestoreVisible = this.#hiddenVisibility.get(node) === true || wasVisible;
    this.#versions.set(node, version);

    if (hideUntilReady && wasVisible && !previousEntry) {
      this.#hiddenVisibility.set(node, true);
      node.visible = false;
    }

    let nextEntry = null;
    try {
      nextEntry = await this.#cache.acquire(source, this.#getRasterDisplaySize(node));
      if (!this.#canApply(node, source, version)) {
        this.#cache.release(nextEntry);
        return;
      }

      if (previousEntry?.url === nextEntry.url) {
        this.#cache.release(nextEntry);
      } else {
        this.#applyRuntimeSource(node, source, nextEntry.url);
        this.#assignments.set(node, nextEntry);
        this.#cache.release(previousEntry);
      }
    } catch (error) {
      this.#context?.eventBus.emit('svg-raster:error', { error, node, source });
      console.warn('[SvgRasterCachePlugin] SVG rasterization failed.', error);
    } finally {
      if (this.#canRestoreVisibility(node, version) && shouldRestoreVisible) {
        node.visible = true;
        this.#hiddenVisibility.delete(node);
      }
    }
  }

  /** @private @param {Object} node 图片节点。 @param {string} source 原始 URL。 @param {string} runtimeUrl 栅格 URL。 @returns {void} */
  #applyRuntimeSource(node, source, runtimeUrl) {
    const paint = this.#getImagePaint(node);
    node.set?.({ url: undefined });
    node.set?.({
      fill: {
        align: paint?.align ?? 'center',
        mode: paint?.mode ?? 'stretch',
        type: 'image',
        url: runtimeUrl
      }
    });
    node[IMAGE_SOURCE_URL_KEY] = source;
    node[IMAGE_SOURCE_FORMAT_KEY] = 'svg';
    node[SVG_RUNTIME_CACHE_URL_KEY] = runtimeUrl;
    node.forceUpdate?.();
    node.updateLayout?.();
  }

  /** @private @param {Object | null} node 图片节点。 @returns {void} */
  #scheduleNode(node) {
    if (!node) {
      return;
    }

    this.#scheduleRefresh(() => this.#handleImageChanged(node, false));
  }

  /** @private @returns {void} */
  #scheduleAllNodes() {
    this.#scheduleRefresh(() => {
      this.#visitNodes(this.#context?.contentLayer?.children, (node) => {
        this.#handleImageChanged(node, false);
      });
    });
  }

  /** @private @param {Function} callback 刷新函数。 @returns {void} */
  #scheduleRefresh(callback) {
    if (this.#refreshTimer) {
      clearTimeout(this.#refreshTimer);
    }
    this.#refreshTimer = setTimeout(() => {
      this.#refreshTimer = null;
      callback();
    }, RASTER_REFRESH_DELAY);
  }

  /** @private @param {Object} node 图片节点。 @returns {void} */
  #releaseNode(node) {
    const entry = this.#assignments.get(node);
    this.#cache.release(entry);
    this.#assignments.delete(node);
    this.#hiddenVisibility.delete(node);
    if (node) {
      delete node[SVG_RUNTIME_CACHE_URL_KEY];
    }
  }

  /** @private @returns {{ width: number, height: number }} */
  #getRasterDisplaySize(node) {
    const zoom = Number(this.#context?.state?.zoom ?? 1);
    const pixelRatio = Number(this.#context?.leafer?.canvas?.pixelRatio ?? 1);
    const transform = node.getTransform?.(this.#context?.contentLayer);
    const scaleX = transform
      ? Math.hypot(Number(transform.a ?? 1), Number(transform.b ?? 0))
      : Math.abs(Number(node.scaleX ?? 1));
    const scaleY = transform
      ? Math.hypot(Number(transform.c ?? 0), Number(transform.d ?? 1))
      : Math.abs(Number(node.scaleY ?? 1));

    return {
      width: Number(node.width ?? 1) * scaleX * zoom * pixelRatio,
      height: Number(node.height ?? 1) * scaleY * zoom * pixelRatio
    };
  }

  /** @private @returns {string | null} */
  #getSource(node) {
    const paint = this.#getImagePaint(node);
    const runtimeSource = node?.[IMAGE_SOURCE_URL_KEY] ?? node?.url ?? paint?.url;
    const source = this.#cache.resolveSource(runtimeSource) ?? runtimeSource;
    return typeof source === 'string' && source ? source : null;
  }

  /** @private @returns {Object | null} */
  #getImagePaint(node) {
    const inputFill = node?.__?.__input?.fill;
    return Array.isArray(inputFill) ? inputFill[0] : inputFill ?? null;
  }

  /** @private @returns {boolean} */
  #isImageNode(node) {
    const tag = String(node?.tag ?? node?.constructor?.name ?? '').toLowerCase();
    return tag.includes('image');
  }

  /** @private @returns {boolean} */
  #canApply(node, source, version) {
    return Boolean(
      this.#context
      && node?.parent
      && this.#versions.get(node) === version
      && this.#getSource(node) === source
    );
  }

  /** @private @returns {boolean} */
  #canRestoreVisibility(node, version) {
    return Boolean(this.#context && node?.parent && this.#versions.get(node) === version);
  }

  /**
   * 深度遍历场景节点，确保组合内的 SVG 图片同样进入缓存流程。
   *
   * @private
   * @param {Object[] | undefined} nodes 场景节点列表。
   * @param {Function} callback 节点处理函数。
   * @returns {void}
   */
  #visitNodes(nodes, callback) {
    (nodes ?? []).forEach((node) => {
      callback(node);
      if (node?.children?.length) {
        this.#visitNodes(node.children, callback);
      }
    });
  }
}

/**
 * 创建 SVG 缓存与 Leafer Resource 之间的适配器。
 *
 * @returns {{ load: Function, remove: Function, set: Function }} 资源适配器。
 */
function createLeaferResourceAdapter() {
  return {
    load: (source) => Resource.get(source) ?? Resource.loadImage(source),
    remove: (url) => Resource.remove(url),
    set: (url, view) => Resource.setImage(url, view)
  };
}
