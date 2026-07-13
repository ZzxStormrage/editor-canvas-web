import { Image as LeaferImage, Platform, Resource, isString } from 'leafer-ui';

import { EditorError } from '../../../errors/editor-error.js';
import { getElementDataContainer } from '../../../utils/element-data.js';
import { normalizeOptionalPositiveNumber } from '../../../utils/number.js';
import { normalizeImageOptions } from '../../../utils/image.js';

/**
 * 图片插件 —— 全部基于 leafer-ui 原生 API。
 *
 * @author zzx
 * @since 2026-06-30
 */
export class ImagePlugin {
  constructor() {
    /** @private @type {Object | null} */
    this._context = null;
  }

  /**
   * 插件唯一标识。
   *
   * @returns {string} 插件 ID。
   */
  get id() {
    return 'image';
  }

  /**
   * 插件显示名称。
   *
   * @returns {string} 插件名称。
   */
  get name() {
    return 'Image';
  }

  /**
   * 插件依赖。
   *
   * @returns {string[]} 依赖插件 ID 列表。
   */
  get dependencies() {
    return [];
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
   * 添加图片到内容图层。
   *
   * 图片 URL / File / Blob 归一化为 URL 后，
   * 使用 {@link Resource.loadImage} 获取原始尺寸。
   * 最终用 leafer-ui 原生 {@link LeaferImage} 渲染。
   *
   * @param {string | File | Blob} source 图片 URL、File 或 Blob。
   * @param {Object} [options] 图片放置配置。
   * @returns {Promise<LeaferImage>} 图片节点。
   * @throws {EditorError} 当读取或创建图片失败时抛出。
   */
  async add(source, options = {}) {
    this._assertReady();

    try {
      const { contentLayer, eventBus, state } = this._context;
      const imageSource = await this._normalizeSource(source);
      const imageSize = await this._loadImageSize(imageSource.url);
      const imageConfig = this._normalizePlacement(imageSize, options, state);
      const image = new LeaferImage({
        url: imageSource.url,
        draggable: true,
        editable: true,
        lockRatio: true,
        ...imageConfig
      });

      getElementDataContainer(image, true);
      contentLayer.add(image);
      // 延迟到下一帧 select，确保 contentLayer.add() 后 Leafer
      // 内部渲染管线稳定，避免 editTool 尚未加载时触发 update()
      await new Promise(resolve => requestAnimationFrame(resolve));
      this._context.innerEditor?.select(image);
      eventBus.emit('image:added', { image });

      return image;
    } catch (error) {
      if (error instanceof EditorError) {
        throw error;
      }

      throw new EditorError(error.message || 'Add image failed.', 'IMAGE_ADD_FAILED');
    }
  }

  /**
   * 销毁插件。
   *
   * @returns {void}
   */
  destroy() {
    this._context = null;
  }

  /**
   * 归一化图片插件配置。
   *
   * @param {Object} [image] 外部传入配置。
   * @param {Object} [baseImage] 基础配置。
   * @returns {Object} 归一化后的配置。
   */
  static normalizeOptions(image = {}, baseImage = {}) {
    return normalizeImageOptions(image, baseImage);
  }

  /**
   * 计算图片放置位置和尺寸。
   *
   * @private
   * @param {{ width: number, height: number }} imageSize 图片原始尺寸。
   * @param {Object} options 外部放置配置。
   * @param {Object} state 编辑器状态。
   * @returns {{ x: number, y: number, width: number, height: number, lockRatio: boolean }} 图片节点配置。
   */
  _normalizePlacement(imageSize, options, state) {
    const bounds = this._getOperationBounds(state);
    const mergedOptions = ImagePlugin.normalizeOptions({
      ...state.imageOptions,
      ...(options ?? {})
    });
    const maxWidth = bounds.width * mergedOptions.maxWidthRatio;
    const maxHeight = bounds.height * mergedOptions.maxHeightRatio;
    const scale = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height, 1);
    const width =
      normalizeOptionalPositiveNumber(mergedOptions.width, 'image.width') ??
      imageSize.width * scale;
    const height =
      normalizeOptionalPositiveNumber(mergedOptions.height, 'image.height') ??
      imageSize.height * scale;

    return {
      x: mergedOptions.x ?? bounds.x + (bounds.width - width) / 2,
      y: mergedOptions.y ?? bounds.y + (bounds.height - height) / 2,
      width,
      height,
      lockRatio: mergedOptions.lockRatio ?? true
    };
  }

  /**
   * 获取当前操作区域，优先使用白色画板。
   *
   * @private
   * @param {Object} state 编辑器状态。
   * @returns {{ x: number, y: number, width: number, height: number }} 操作区域。
   */
  _getOperationBounds(state) {
    return this._context?.artboard?.getContentBounds?.() ?? {
      x: 0,
      y: 0,
      width: state.width,
      height: state.height
    };
  }

  /**
   * 归一化图片来源。
   *
   * - SVG 字符串 → Platform.toURL(svg, 'svg')
   * - URL 字符串 → 直接作为 URL
   * - SVG File / Blob → 读取文本后 Platform.toURL(svg, 'svg')
   * - File / Blob → 生成 blob URL（供 leafer-ui Image 加载）
   *
   * @private
   * @param {string | File | Blob} source 图片来源。
   * @returns {Promise<{ url: string, format: 'svg' | 'image' }>} 可用于 leafer-ui Image.url 的资源。
   * @throws {EditorError} 当来源类型不支持时抛出。
   */
  async _normalizeSource(source) {
    if (isString(source)) {
      return this._normalizeStringSource(source);
    }

    if (typeof File !== 'undefined' && source instanceof File) {
      return this._normalizeBlobSource(source);
    }

    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      return this._normalizeBlobSource(source);
    }

    throw new EditorError(
      'image.add(source) requires a url, File, or Blob.',
      'IMAGE_SOURCE_INVALID'
    );
  }

  /**
   * 归一化字符串图片来源。
   *
   * @private
   * @param {string} source SVG 字符串或图片 URL。
   * @returns {{ url: string, format: 'svg' | 'image' }} 图片资源。
   */
  _normalizeStringSource(source) {
    if (this._isSvgText(source)) {
      return {
        url: Platform.toURL(source, 'svg'),
        format: 'svg'
      };
    }

    return {
      url: source,
      format: this._isSvgUrl(source) ? 'svg' : 'image'
    };
  }

  /**
   * 归一化 File / Blob 图片来源。
   *
   * SVG 使用 Leafer 官方 Platform.toURL(svg, 'svg') 方式加载。
   *
   * @private
   * @param {File | Blob} source 图片文件。
   * @returns {Promise<{ url: string, format: 'svg' | 'image' }>} 图片资源。
   */
  async _normalizeBlobSource(source) {
    if (this._isSvgBlob(source)) {
      const svg = await source.text();

      return {
        url: Platform.toURL(svg, 'svg'),
        format: 'svg'
      };
    }

    return {
      url: URL.createObjectURL(source),
      format: 'image'
    };
  }

  /**
   * 判断字符串是否为 SVG 文本。
   *
   * @private
   * @param {string} source 输入字符串。
   * @returns {boolean}
   */
  _isSvgText(source) {
    return /^\s*<svg[\s>]/i.test(source);
  }

  /**
   * 判断 URL 是否指向 SVG。
   *
   * @private
   * @param {string} source 输入 URL。
   * @returns {boolean}
   */
  _isSvgUrl(source) {
    return /\.svg(?:[?#].*)?$/i.test(source);
  }

  /**
   * 判断 File / Blob 是否为 SVG。
   *
   * @private
   * @param {File | Blob} source 图片文件。
   * @returns {boolean}
   */
  _isSvgBlob(source) {
    return source.type === 'image/svg+xml' || this._isSvgUrl(source.name ?? '');
  }

  /**
   * 使用 leafer-ui Resource 加载图片并获取原始尺寸。
   *
   * @private
   * @param {string} source 图片 URL / DataURL / blob URL。
   * @returns {Promise<{ width: number, height: number }>} 图片尺寸。
   */
  async _loadImageSize(source) {
    const image = await Resource.loadImage(source);

    return {
      width: image.width,
      height: image.height
    };
  }

  /**
   * 断言插件已初始化。
   *
   * @private
   * @returns {void}
   * @throws {EditorError} 当插件不可用时抛出。
   */
  _assertReady() {
    if (typeof this._context?.contentLayer?.add !== 'function') {
      throw new EditorError('ImagePlugin requires contentLayer.', 'IMAGE_PLUGIN_NOT_READY');
    }

    if (this._context.state.destroyed) {
      throw new EditorError('Editor has been destroyed.', 'EDITOR_DESTROYED');
    }
  }
}
