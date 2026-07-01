import { Image as LeaferImage, Resource, MathHelper, isString } from 'leafer-ui';

import { EditorError } from '../../../errors/editor-error.js';
import {
  normalizeOptionalPositiveNumber,
  normalizeRatio
} from '../../../utils/number.js';

/**
 * 图片插件。
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
      const imageSize = await this._loadImageSize(imageSource);
      const imageConfig = this._normalizePlacement(imageSize, options, state);
      const image = new LeaferImage({
        url: imageSource,
        draggable: true,
        editable: true,
        ...imageConfig
      });

      contentLayer.add(image);
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
    const normalizedImage = {
      ...baseImage,
      ...(image ?? {})
    };

    normalizedImage.maxWidthRatio = normalizeRatio(
      normalizedImage.maxWidthRatio,
      'image.maxWidthRatio'
    );
    normalizedImage.maxHeightRatio = normalizeRatio(
      normalizedImage.maxHeightRatio,
      'image.maxHeightRatio'
    );

    return normalizedImage;
  }

  /**
   * 计算图片放置位置和尺寸。
   *
   * @private
   * @param {{ width: number, height: number }} imageSize 图片原始尺寸。
   * @param {Object} options 外部放置配置。
   * @param {Object} state 编辑器状态。
   * @returns {{ x: number, y: number, width: number, height: number }} 图片节点配置。
   */
  _normalizePlacement(imageSize, options, state) {
    const mergedOptions = ImagePlugin.normalizeOptions({
      ...state.imageOptions,
      ...(options ?? {})
    });
    const maxWidth = state.width * mergedOptions.maxWidthRatio;
    const maxHeight = state.height * mergedOptions.maxHeightRatio;
    const scale = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height, 1);
    const width =
      normalizeOptionalPositiveNumber(mergedOptions.width, 'image.width') ??
      imageSize.width * scale;
    const height =
      normalizeOptionalPositiveNumber(mergedOptions.height, 'image.height') ??
      imageSize.height * scale;

    return {
      x: mergedOptions.x ?? (state.width - width) / 2,
      y: mergedOptions.y ?? (state.height - height) / 2,
      width,
      height
    };
  }

  /**
   * 归一化图片来源。
   *
   * @private
   * @param {string | File | Blob} source 图片来源。
   * @returns {Promise<string>} 可用于 Leafer Image 的 URL。
   * @throws {EditorError} 当来源类型不支持时抛出。
   */
  async _normalizeSource(source) {
    if (isString(source)) {
      return source;
    }

    const isFile = typeof File !== 'undefined' && source instanceof File;
    const isBlob = typeof Blob !== 'undefined' && source instanceof Blob;

    if (isFile || isBlob) {
      return this._readFileAsDataURL(source);
    }

    throw new EditorError(
      'image.add(source) requires a url, File, or Blob.',
      'IMAGE_SOURCE_INVALID'
    );
  }

  /**
   * 读取文件为 DataURL。
   *
   * @private
   * @param {File | Blob} file 文件对象。
   * @returns {Promise<string>} DataURL。
   */
  _readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * 使用 LeaferJS Resource 加载图片并获取尺寸。
   *
   * @private
   * @param {string} source 图片 URL 或 DataURL。
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
    if (!this._context?.contentLayer) {
      throw new EditorError('ImagePlugin requires contentLayer.', 'IMAGE_PLUGIN_NOT_READY');
    }

    if (this._context.state.destroyed) {
      throw new EditorError('Editor has been destroyed.', 'EDITOR_DESTROYED');
    }
  }
}
