import { Image as LeaferImage, Platform, Resource, isString } from 'leafer-ui';
import {
  EditorEvent,
  EditorMoveEvent,
  EditorRotateEvent,
  EditorScaleEvent
} from '@leafer-in/editor';

import { EditorError } from '../../../errors/editor-error.js';
import { getElementDataContainer } from '../../../utils/element-data.js';
import { normalizeOptionalPositiveNumber } from '../../../utils/number.js';
import { normalizeImageOptions } from '../../../utils/image.js';

const ORIGINAL_WIDTH_KEY = '__canvasEditorOriginalWidth';
const ORIGINAL_HEIGHT_KEY = '__canvasEditorOriginalHeight';

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
    /** @private @type {Set<string>} */
    this._ownedObjectUrls = new Set();
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
    context.innerEditor?.on_(EditorEvent.SELECT, this._emitSelectionChanged, this);
    context.innerEditor?.on_(EditorMoveEvent.MOVE, this._emitSelectionChanged, this);
    context.innerEditor?.on_(EditorScaleEvent.SCALE, this._emitSelectionChanged, this);
    context.innerEditor?.on_(EditorRotateEvent.ROTATE, this._emitSelectionChanged, this);
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
    let imageSource = null;

    try {
      const { contentLayer, eventBus, state } = this._context;
      const shouldSelect = options.select !== false;
      imageSource = await this._normalizeSource(source);
      const imageSize = await this._loadImageSize(imageSource.url);
      const imageConfig = this._normalizePlacement(imageSize, options, state);
      const image = new LeaferImage({
        url: imageSource.url,
        draggable: true,
        editable: true,
        lockRatio: true,
        ...imageConfig
      });

      image[ORIGINAL_WIDTH_KEY] = imageSize.width;
      image[ORIGINAL_HEIGHT_KEY] = imageSize.height;
      getElementDataContainer(image, true);
      contentLayer.add(image);
      if (imageSource.ownedObjectUrl) {
        this._ownedObjectUrls.add(imageSource.url);
      }
      if (shouldSelect) {
        // 等待节点进入 Leafer 渲染管线后再创建选框。
        await new Promise(resolve => requestAnimationFrame(resolve));
        this._context.innerEditor?.select(image);
      }
      eventBus.emit('image:added', { image });

      return image;
    } catch (error) {
      if (imageSource?.ownedObjectUrl && !this._ownedObjectUrls.has(imageSource.url)) {
        URL.revokeObjectURL(imageSource.url);
      }
      if (error instanceof EditorError) {
        throw error;
      }

      throw new EditorError(error.message || 'Add image failed.', 'IMAGE_ADD_FAILED');
    }
  }

  /**
   * 读取图片原始像素尺寸，不创建画布节点。
   *
   * 图片解析仍由 ImagePlugin 统一负责，避免 Vue composable 重复实现 URL、SVG、
   * File 和 Blob 的兼容逻辑。
   *
   * @param {string | File | Blob} source 图片来源。
   * @returns {Promise<{ width: number, height: number }>} 原始像素尺寸。
   * @throws {EditorError} 当图片来源无效或尺寸读取失败时抛出。
   */
  async getSize(source) {
    this._assertReady();
    let imageSource = null;

    try {
      imageSource = await this._normalizeSource(source);
      return await this._loadImageSize(imageSource.url);
    } catch (error) {
      if (error instanceof EditorError) {
        throw error;
      }

      throw new EditorError(error.message || 'Read image size failed.', 'IMAGE_SIZE_READ_FAILED');
    } finally {
      if (imageSource?.ownedObjectUrl) {
        URL.revokeObjectURL(imageSource.url);
      }
    }
  }

  /**
   * 获取当前单选图片的可编辑属性快照。
   *
   * 位置以画板左上角为原点，尺寸为用户实际看到的显示尺寸，缩放比例以图片
   * 原始像素尺寸为 100%。
   *
   * @returns {{
   *   x: number,
   *   y: number,
   *   width: number,
   *   height: number,
   *   originalWidth: number,
   *   originalHeight: number,
   *   scalePercentX: number,
   *   scalePercentY: number,
   *   rotation: number,
   *   opacity: number,
   *   lockRatio: boolean,
   *   flippedX: boolean,
   *   flippedY: boolean,
   *   locked: boolean
   * } | null} 图片属性；非单选图片时返回 null。
   */
  getSelectedProperties() {
    const image = this._getSelectedImage();
    return image ? this._createPropertiesSnapshot(image) : null;
  }

  /**
   * 更新当前单选图片属性。
   *
   * @param {Object} properties 图片属性补丁。
   * @returns {Object | null} 更新后的图片属性；非单选图片时返回 null。
   * @throws {EditorError} 当属性值无效时抛出。
   */
  updateSelectedProperties(properties = {}) {
    this._assertReady();
    const image = this._getSelectedImage();

    if (!image) {
      return null;
    }

    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      throw new EditorError('Image properties must be an object.', 'IMAGE_PROPERTIES_INVALID');
    }

    if (image.locked) {
      return this._createPropertiesSnapshot(image);
    }

    const current = this._createPropertiesSnapshot(image);
    const patch = this._createTransformPatch(image, current, properties);

    image.set?.(patch);
    image.forceUpdate?.();
    image.updateLayout?.();
    this._context.innerEditor?.update?.();
    this._context.innerEditor?.updateEditBox?.();
    this._context.artboard?.syncAllElements?.();

    const nextProperties = this._createPropertiesSnapshot(image);
    this._context.eventBus.emit('image:updated', { image, properties: nextProperties });
    this._emitSelectionChanged();
    return nextProperties;
  }

  /**
   * 将当前单选图片恢复到原始像素尺寸。
   *
   * @returns {Object | null} 更新后的图片属性；非单选图片时返回 null。
   */
  resetSelectedSize() {
    const properties = this.getSelectedProperties();

    if (!properties) {
      return null;
    }

    return this.updateSelectedProperties({
      width: properties.originalWidth,
      height: properties.originalHeight
    });
  }

  /**
   * 销毁插件。
   *
   * @returns {void}
   */
  destroy() {
    this._context?.innerEditor?.off_(EditorEvent.SELECT, this._emitSelectionChanged, this);
    this._context?.innerEditor?.off_(EditorMoveEvent.MOVE, this._emitSelectionChanged, this);
    this._context?.innerEditor?.off_(EditorScaleEvent.SCALE, this._emitSelectionChanged, this);
    this._context?.innerEditor?.off_(EditorRotateEvent.ROTATE, this._emitSelectionChanged, this);
    this._ownedObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this._ownedObjectUrls.clear();
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
   * 获取当前严格单选的图片节点。
   *
   * @private
   * @returns {LeaferImage | null} 图片节点。
   */
  _getSelectedImage() {
    const selected = this._context?.innerEditor?.list ?? [];
    const image = selected.length === 1 ? selected[0] : null;

    return image instanceof LeaferImage ? image : null;
  }

  /**
   * 创建图片属性 DTO，隔离 UI 与 Leafer 节点实现。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @returns {Object} 可序列化图片属性。
   */
  _createPropertiesSnapshot(image) {
    const bounds = this._getOperationBounds(this._context.state);
    const baseWidth = this._getPositiveNumber(image.width ?? image.__?.width, 1);
    const baseHeight = this._getPositiveNumber(image.height ?? image.__?.height, 1);
    const originalWidth = this._getPositiveNumber(
      image[ORIGINAL_WIDTH_KEY] ?? image.image?.width,
      baseWidth
    );
    const originalHeight = this._getPositiveNumber(
      image[ORIGINAL_HEIGHT_KEY] ?? image.image?.height,
      baseHeight
    );
    const scaleX = this._getFiniteNumber(image.scaleX, 1);
    const scaleY = this._getFiniteNumber(image.scaleY, 1);
    const width = baseWidth * Math.abs(scaleX);
    const height = baseHeight * Math.abs(scaleY);

    return {
      x: this._round(this._getFiniteNumber(image.x, 0) - bounds.x),
      y: this._round(this._getFiniteNumber(image.y, 0) - bounds.y),
      width: this._round(width),
      height: this._round(height),
      originalWidth: this._round(originalWidth),
      originalHeight: this._round(originalHeight),
      scalePercentX: this._round(width / originalWidth * 100),
      scalePercentY: this._round(height / originalHeight * 100),
      rotation: this._round(this._getFiniteNumber(image.rotation, 0)),
      opacity: this._round(this._getFiniteNumber(image.opacity, 1) * 100),
      lockRatio: image.lockRatio !== false,
      flippedX: scaleX < 0,
      flippedY: scaleY < 0,
      locked: Boolean(image.locked)
    };
  }

  /**
   * 将 UI 属性补丁转换为 Leafer 节点变换补丁。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @param {Object} current 当前属性快照。
   * @param {Object} properties UI 属性补丁。
   * @returns {Object} Leafer set() 参数。
   */
  _createTransformPatch(image, current, properties) {
    const bounds = this._getOperationBounds(this._context.state);
    const patch = {};
    const lockRatio = this._getOptionalBoolean(properties.lockRatio, 'lockRatio');
    const nextLockRatio = lockRatio ?? current.lockRatio;

    this._setPositionPatch(patch, properties, bounds);
    this._setVisualSizePatch(patch, image, current, properties, nextLockRatio);
    this._setAppearancePatch(patch, properties);
    this._setFlipPatch(patch, image, properties);

    if (lockRatio !== undefined) {
      patch.lockRatio = lockRatio;
    }

    return patch;
  }

  /**
   * 写入画板相对坐标。
   *
   * @private
   * @param {Object} patch Leafer 属性补丁。
   * @param {Object} properties UI 属性补丁。
   * @param {{ x: number, y: number }} bounds 画板边界。
   * @returns {void}
   */
  _setPositionPatch(patch, properties, bounds) {
    const x = this._getOptionalNumber(properties.x, 'x');
    const y = this._getOptionalNumber(properties.y, 'y');

    if (x !== undefined) patch.x = bounds.x + x;
    if (y !== undefined) patch.y = bounds.y + y;
  }

  /**
   * 写入显示尺寸和相对原图的缩放比例。
   *
   * @private
   * @param {Object} patch Leafer 属性补丁。
   * @param {LeaferImage} image 图片节点。
   * @param {Object} current 当前属性快照。
   * @param {Object} properties UI 属性补丁。
   * @param {boolean} lockRatio 是否锁定比例。
   * @returns {void}
   */
  _setVisualSizePatch(patch, image, current, properties, lockRatio) {
    const requested = this._getRequestedVisualSize(current, properties);

    if (requested.width === undefined && requested.height === undefined) {
      return;
    }

    const size = this._completeLockedSize(current, requested, lockRatio);
    const baseWidth = this._getPositiveNumber(image.width ?? image.__?.width, 1);
    const baseHeight = this._getPositiveNumber(image.height ?? image.__?.height, 1);
    const scaleXSign = this._getFiniteNumber(image.scaleX, 1) < 0 ? -1 : 1;
    const scaleYSign = this._getFiniteNumber(image.scaleY, 1) < 0 ? -1 : 1;

    if (size.width !== undefined) patch.scaleX = scaleXSign * size.width / baseWidth;
    if (size.height !== undefined) patch.scaleY = scaleYSign * size.height / baseHeight;
  }

  /**
   * 读取尺寸字段，并把百分比缩放换算成显示像素。
   *
   * @private
   * @param {Object} current 当前属性快照。
   * @param {Object} properties UI 属性补丁。
   * @returns {{ width: number | undefined, height: number | undefined }} 显示尺寸。
   */
  _getRequestedVisualSize(current, properties) {
    const width = this._getOptionalPositiveNumber(properties.width, 'width');
    const height = this._getOptionalPositiveNumber(properties.height, 'height');
    const scalePercentX = this._getOptionalPositiveNumber(
      properties.scalePercentX,
      'scalePercentX'
    );
    const scalePercentY = this._getOptionalPositiveNumber(
      properties.scalePercentY,
      'scalePercentY'
    );

    return {
      width: scalePercentX === undefined
        ? width
        : current.originalWidth * scalePercentX / 100,
      height: scalePercentY === undefined
        ? height
        : current.originalHeight * scalePercentY / 100
    };
  }

  /**
   * 单边调整且锁定比例时，同步计算另一边尺寸。
   *
   * @private
   * @param {Object} current 当前属性快照。
   * @param {{ width: number | undefined, height: number | undefined }} requested 请求尺寸。
   * @param {boolean} lockRatio 是否锁定比例。
   * @returns {{ width: number | undefined, height: number | undefined }} 完整尺寸。
   */
  _completeLockedSize(current, requested, lockRatio) {
    const hasBothOrNeither = (requested.width === undefined) === (requested.height === undefined);

    if (!lockRatio || hasBothOrNeither) {
      return requested;
    }

    const ratio = current.width / current.height;
    return requested.width !== undefined
      ? { width: requested.width, height: requested.width / ratio }
      : { width: requested.height * ratio, height: requested.height };
  }

  /**
   * 写入旋转和不透明度。
   *
   * @private
   * @param {Object} patch Leafer 属性补丁。
   * @param {Object} properties UI 属性补丁。
   * @returns {void}
   */
  _setAppearancePatch(patch, properties) {
    const rotation = this._getOptionalNumber(properties.rotation, 'rotation');
    const opacity = this._getOptionalNumber(properties.opacity, 'opacity');

    if (rotation !== undefined) patch.rotation = rotation;
    if (opacity !== undefined) patch.opacity = Math.min(100, Math.max(0, opacity)) / 100;
  }

  /**
   * 写入水平或垂直翻转，保持当前缩放绝对值不变。
   *
   * @private
   * @param {Object} patch Leafer 属性补丁。
   * @param {LeaferImage} image 图片节点。
   * @param {Object} properties UI 属性补丁。
   * @returns {void}
   */
  _setFlipPatch(patch, image, properties) {
    const flippedX = this._getOptionalBoolean(properties.flippedX, 'flippedX');
    const flippedY = this._getOptionalBoolean(properties.flippedY, 'flippedY');

    if (flippedX !== undefined) {
      patch.scaleX = (flippedX ? -1 : 1) * Math.abs(
        patch.scaleX ?? this._getFiniteNumber(image.scaleX, 1)
      );
    }
    if (flippedY !== undefined) {
      patch.scaleY = (flippedY ? -1 : 1) * Math.abs(
        patch.scaleY ?? this._getFiniteNumber(image.scaleY, 1)
      );
    }
  }

  /**
   * 通知应用层当前图片选区属性发生变化。
   *
   * @private
   * @returns {void}
   */
  _emitSelectionChanged() {
    const image = this._getSelectedImage();
    this._context?.eventBus.emit('image:selection-changed', {
      image,
      properties: image ? this._createPropertiesSnapshot(image) : null
    });
  }

  /** @private @param {*} value 输入值。 @param {number} fallback 回退值。 @returns {number} */
  _getFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /** @private @param {*} value 输入值。 @param {number} fallback 回退值。 @returns {number} */
  _getPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  /** @private @param {*} value 输入值。 @param {string} key 属性名。 @returns {number | undefined} */
  _getOptionalNumber(value, key) {
    if (value === undefined || value === null) return undefined;
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new EditorError(`image.${key} must be a number.`, 'IMAGE_PROPERTY_NUMBER_INVALID');
    }

    return number;
  }

  /** @private @param {*} value 输入值。 @param {string} key 属性名。 @returns {number | undefined} */
  _getOptionalPositiveNumber(value, key) {
    const number = this._getOptionalNumber(value, key);

    if (number !== undefined && number <= 0) {
      throw new EditorError(`image.${key} must be greater than 0.`, 'IMAGE_PROPERTY_SIZE_INVALID');
    }

    return number;
  }

  /** @private @param {*} value 输入值。 @param {string} key 属性名。 @returns {boolean | undefined} */
  _getOptionalBoolean(value, key) {
    if (value === undefined || value === null) return undefined;

    if (typeof value !== 'boolean') {
      throw new EditorError(`image.${key} must be a boolean.`, 'IMAGE_PROPERTY_BOOLEAN_INVALID');
    }

    return value;
  }

  /** @private @param {number} value 输入值。 @returns {number} 最多保留两位小数。 */
  _round(value) {
    return Number(value.toFixed(2));
  }

  /**
   * 计算图片放置位置和尺寸。
   *
   * @private
   * @param {{ width: number, height: number }} imageSize 图片原始尺寸。
   * @param {Object} options 外部放置配置。
   * @param {Object} state 编辑器状态。
   * @returns {{ x: number, y: number, width: number, height: number, lockRatio: boolean,
   * visible: boolean }} 图片节点配置。
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
      lockRatio: mergedOptions.lockRatio ?? true,
      visible: mergedOptions.visible ?? true
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
   * @returns {Promise<{ url: string, format: 'svg' | 'image', ownedObjectUrl: boolean }>}
   * 可用于 leafer-ui Image.url 的资源。
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
   * @returns {{ url: string, format: 'svg' | 'image', ownedObjectUrl: boolean }}
   * 图片资源。
   */
  _normalizeStringSource(source) {
    if (this._isSvgText(source)) {
      return {
        url: Platform.toURL(source, 'svg'),
        format: 'svg',
        ownedObjectUrl: false
      };
    }

    return {
      url: source,
      format: this._isSvgUrl(source) ? 'svg' : 'image',
      ownedObjectUrl: false
    };
  }

  /**
   * 归一化 File / Blob 图片来源。
   *
   * SVG 使用 Leafer 官方 Platform.toURL(svg, 'svg') 方式加载。
   *
   * @private
   * @param {File | Blob} source 图片文件。
   * @returns {Promise<{ url: string, format: 'svg' | 'image', ownedObjectUrl: boolean }>}
   * 图片资源。
   */
  async _normalizeBlobSource(source) {
    if (this._isSvgBlob(source)) {
      const svg = await source.text();
      const url = Platform.toURL(svg, 'svg');

      return {
        url,
        format: 'svg',
        ownedObjectUrl: typeof url === 'string' && url.startsWith('blob:')
      };
    }

    return {
      url: URL.createObjectURL(source),
      format: 'image',
      ownedObjectUrl: true
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
