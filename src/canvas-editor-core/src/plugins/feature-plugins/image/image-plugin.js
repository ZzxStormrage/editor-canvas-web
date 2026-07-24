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
import {
  normalizeImageReplacementFit,
  toLeaferImageMode
} from '../../../utils/image-fit.js';
import {
  IMAGE_SOURCE_FORMAT_KEY,
  IMAGE_SOURCE_URL_KEY,
  isSvgImageSource
} from '../../../utils/image-runtime.js';

const ORIGINAL_WIDTH_KEY = '__canvasEditorOriginalWidth';
const ORIGINAL_HEIGHT_KEY = '__canvasEditorOriginalHeight';
const IMAGE_FIT_KEY = '__canvasEditorImageFit';

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
    /** @private @type {Function | null} */
    this._unsubscribeDuplicated = null;
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
    this._unsubscribeDuplicated = context.eventBus.on(
      'selection:duplicated',
      this._copyDuplicatedRuntimeState.bind(this)
    );
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
      image[IMAGE_FIT_KEY] = 'stretch';
      image[IMAGE_SOURCE_URL_KEY] = imageSource.url;
      image[IMAGE_SOURCE_FORMAT_KEY] = imageSource.format;
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
   * 图片解析仍由 ImagePlugin 统一负责，避免外部调用方重复实现 URL、SVG、
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
   * 替换当前严格单选图片的资源。
   *
   * 默认使用 contain 在原外框内等比缩放并水平、垂直居中。资源会先完成加载，
   * 再一次性写入节点，避免先显示原始尺寸造成闪烁。
   *
   * @param {string | File | Blob} source 新图片 URL、File 或 Blob。
   * @param {{ fit?: 'contain' | 'cover' | 'stretch', preserveFrame?: boolean }} [options={}]
   * 替换配置。
   * @returns {Promise<LeaferImage>} 已替换资源的原图片节点。
   * @throws {EditorError} 当未单选图片、图片已锁定或资源加载失败时抛出。
   */
  async replaceSelected(source, options = {}) {
    this._assertReady();
    const image = this._requireSelectedImage();
    return this.replace(image, source, options);
  }

  /**
   * 替换指定图片节点的资源，并保留节点层级和业务属性。
   *
   * @param {LeaferImage} target 指定图片节点。
   * @param {string | File | Blob} source 新图片 URL、File 或 Blob。
   * @param {{ fit?: 'contain' | 'cover' | 'stretch', allowLocked?: boolean,
   * preserveFrame?: boolean }} [options={}]
   * 替换配置。
   * @returns {Promise<LeaferImage>} 已替换资源的原图片节点。
   * @throws {EditorError} 当目标不是图片、图片已锁定或资源加载失败时抛出。
   */
  async replace(target, source, options = {}) {
    this._assertReady();
    const image = this._requireImageTarget(target);
    const replacementOptions = this._normalizeReplacementOptions(options);
    let imageSource = null;

    if (image.locked && !replacementOptions.allowLocked) {
      throw new EditorError('Unlock the image before replacing it.', 'IMAGE_LOCKED');
    }

    try {
      imageSource = await this._normalizeSource(source);
      const imageSize = await this._loadImageSize(imageSource.url);
      const previousUrl = this.getSource(image);

      this._applyReplacement(
        image,
        imageSource.url,
        imageSize,
        replacementOptions.fit,
        replacementOptions.preserveFrame,
        imageSource.format
      );
      this._commitObjectUrlReplacement(previousUrl, imageSource);
      this._notifyImageReplaced(image, replacementOptions.fit);
      return image;
    } catch (error) {
      this._revokeUncommittedObjectUrl(imageSource);
      if (error instanceof EditorError) {
        throw error;
      }

      throw new EditorError(error.message || 'Replace image failed.', 'IMAGE_REPLACE_FAILED');
    }
  }

  /**
   * 获取图片当前资源在节点外框中的适配方式。
   *
   * @param {LeaferImage} target 图片节点。
   * @returns {'contain' | 'cover' | 'stretch' | null} 适配方式；非图片返回 null。
   */
  getFit(target) {
    if (!(target instanceof LeaferImage)) {
      return null;
    }

    const inputFill = target.__?.__input?.fill;
    const imagePaint = Array.isArray(inputFill) ? inputFill[0] : inputFill;
    if (imagePaint?.url) {
      if (imagePaint.mode === 'fit') {
        return 'contain';
      }

      return imagePaint.mode === 'cover' ? 'cover' : 'stretch';
    }

    return target[IMAGE_FIT_KEY] ?? 'stretch';
  }

  /**
   * 获取图片节点当前资源 URL。
   *
   * @param {Object} target 图片节点。
   * @returns {string | null} 图片 URL；非图片或未配置时返回 null。
   */
  getSource(target) {
    if (!(target instanceof LeaferImage)) {
      return null;
    }

    const inputFill = target.__?.__input?.fill;
    const imagePaint = Array.isArray(inputFill) ? inputFill[0] : inputFill;
    const source = target[IMAGE_SOURCE_URL_KEY] ?? target.url ?? imagePaint?.url;
    return typeof source === 'string' && source ? source : null;
  }

  /**
   * 恢复文档图片的适配方式和原始像素尺寸。
   *
   * @param {Object} target Leafer 图片节点。
   * @param {Object} source 文档图片数据。
   * @param {{ width?: number, height?: number }} [resource] 已预加载图片资源。
   * @returns {Object} 原图片节点。
   */
  restoreDocumentState(target, source, resource) {
    if (!(target instanceof LeaferImage)) {
      return target;
    }

    const fit = normalizeImageReplacementFit(source.objectFit === 'fill' ? 'stretch' : source.objectFit ?? 'stretch');
    const url = source.url ?? this.getSource(target);

    this._setImageResourceAndFit(
      target,
      url,
      fit,
      this._resolveDocumentImageAlign(source.objectPosition)
    );
    target[ORIGINAL_WIDTH_KEY] = Number(source.sourceWidth ?? resource?.width ?? target.width ?? 0);
    target[ORIGINAL_HEIGHT_KEY] = Number(source.sourceHeight ?? resource?.height ?? target.height ?? 0);
    target[IMAGE_FIT_KEY] = fit;
    target[IMAGE_SOURCE_URL_KEY] = url;
    target[IMAGE_SOURCE_FORMAT_KEY] = isSvgImageSource(url) ? 'svg' : 'image';
    return target;
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
    const preservedCenter = this._shouldPreserveWorldCenter(properties)
      ? this._getImageWorldCenter(image)
      : null;

    image.set?.(patch);
    image.forceUpdate?.();
    image.updateLayout?.();
    this._restoreImageWorldCenter(image, preservedCenter);
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
    this._unsubscribeDuplicated?.();
    this._unsubscribeDuplicated = null;
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
   * 获取当前严格单选图片，否则抛出业务错误。
   *
   * @private
   * @returns {LeaferImage} 当前图片节点。
   */
  _requireSelectedImage() {
    const image = this._getSelectedImage();

    if (!image) {
      throw new EditorError('Select one image before replacing it.', 'IMAGE_SELECTION_REQUIRED');
    }

    return image;
  }

  /**
   * 校验指定节点为图片。
   *
   * @private
   * @param {*} target 待校验节点。
   * @returns {LeaferImage} 图片节点。
   */
  _requireImageTarget(target) {
    if (!(target instanceof LeaferImage)) {
      throw new EditorError(
        'image.replace(target, source) requires an Image node.',
        'IMAGE_TARGET_INVALID'
      );
    }

    return target;
  }

  /**
   * 归一化替换配置。
   *
   * @private
   * @param {Object} options 替换配置。
   * @returns {{ fit: 'contain' | 'cover' | 'stretch', allowLocked: boolean,
   * preserveFrame: boolean }} 标准配置。
   */
  _normalizeReplacementOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new EditorError(
        'Image replacement options must be an object.',
        'IMAGE_REPLACEMENT_OPTIONS_INVALID'
      );
    }

    if (options.allowLocked !== undefined && typeof options.allowLocked !== 'boolean') {
      throw new EditorError(
        'Image replacement allowLocked must be a boolean.',
        'IMAGE_REPLACEMENT_ALLOW_LOCKED_INVALID'
      );
    }

    if (options.preserveFrame !== undefined && typeof options.preserveFrame !== 'boolean') {
      throw new EditorError(
        'Image replacement preserveFrame must be a boolean.',
        'IMAGE_REPLACEMENT_PRESERVE_FRAME_INVALID'
      );
    }

    return {
      fit: normalizeImageReplacementFit(options.fit),
      allowLocked: options.allowLocked === true,
      preserveFrame: options.preserveFrame !== false
    };
  }

  /**
   * 将 CSS object-position 转换为 Leafer 图片对齐值。
   *
   * @private
   * @param {string | undefined} objectPosition CSS 图片位置。
   * @returns {string} Leafer 对齐值。
   */
  _resolveDocumentImageAlign(objectPosition) {
    const alignMap = {
      'left top': 'top-left',
      'center top': 'top',
      'right top': 'top-right',
      'left center': 'left',
      'center center': 'center',
      'right center': 'right',
      'left bottom': 'bottom-left',
      'center bottom': 'bottom',
      'right bottom': 'bottom-right'
    };

    return alignMap[objectPosition] ?? 'center';
  }

  /**
   * 一次性替换图片资源、填充模式和可选节点几何。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @param {string} url 已加载的新图片 URL。
   * @param {{ width: number, height: number }} imageSize 新图片原始尺寸。
   * @param {'contain' | 'cover' | 'stretch'} fit 适配方式。
   * @param {boolean} preserveFrame 是否保持原节点外框。
   * @param {'svg' | 'image'} format 原始资源格式。
   * @returns {void}
   */
  _applyReplacement(image, url, imageSize, fit, preserveFrame, format) {
    if (!preserveFrame) {
      this._resizeReplacementToFrame(image, imageSize);
    }

    this._setImageResourceAndFit(image, url, fit, 'center');
    image[ORIGINAL_WIDTH_KEY] = imageSize.width;
    image[ORIGINAL_HEIGHT_KEY] = imageSize.height;
    image[IMAGE_FIT_KEY] = fit;
    image[IMAGE_SOURCE_FORMAT_KEY] = format;
    image.forceUpdate?.();
    image.updateLayout?.();
    this._context.innerEditor?.update?.();
    this._context.innerEditor?.updateEditBox?.();
    this._context.artboard?.syncAllElements?.();
  }

  /**
   * 更新资源和适配模式，避免 Leafer URL 处理将 fill 强制重置为 stretch。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @param {string} url 图片 URL。
   * @param {'contain' | 'cover' | 'stretch'} fit 适配方式。
   * @param {string} align Leafer 对齐方式。
   * @returns {void}
   */
  _setImageResourceAndFit(image, url, fit, align) {
    // Image.url 是 stretch 快捷属性，固定外框的 contain/cover 必须由 fill 渲染。
    image.set?.({ url: undefined });
    image.set?.({
      fill: {
        type: 'image',
        mode: toLeaferImageMode(fit),
        align,
        url
      }
    });
    image[IMAGE_SOURCE_URL_KEY] = url;
  }

  /**
   * 以原选框为最大范围计算新尺寸，保留原缩放和世界中心。
   *
   * @private
   * @param {LeaferImage} image 当前图片节点。
   * @param {{ width: number, height: number }} imageSize 新图片原始尺寸。
   * @returns {void}
   */
  _resizeReplacementToFrame(image, imageSize) {
    // 1. 保留变换属性，仅将原节点尺寸作为 contain 的最大范围。
    const baseWidth = this._getPositiveNumber(image.width ?? image.__?.width, 1);
    const baseHeight = this._getPositiveNumber(image.height ?? image.__?.height, 1);
    const worldCenter = this._getImageWorldCenter(image);

    // 2. 按新图原始比例完整放入原范围，不改动 scaleX/scaleY。
    const fitScale = Math.min(
      baseWidth / imageSize.width,
      baseHeight / imageSize.height
    );
    image.set({
      width: imageSize.width * fitScale,
      height: imageSize.height * fitScale,
      lockRatio: true
    });

    // 3. 尺寸更新后只补偿位置，确保世界中心不漂移。
    const nextCenter = this._getImageWorldCenter(image);
    image.moveWorld(worldCenter.x - nextCenter.x, worldCenter.y - nextCenter.y);
  }

  /**
   * 获取图片选框的世界坐标中心。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @returns {{ x: number, y: number }} 世界中心坐标。
   */
  _getImageWorldCenter(image) {
    image.updateLayout?.();
    const bounds = image.boxBounds;
    return image.getWorldPoint({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    });
  }

  /**
   * 判断本次属性修改是否需要保留图片当前视觉中心。
   *
   * 显式修改 x 或 y 时以用户输入为准；仅调整尺寸、缩放、旋转或翻转时，
   * 图片继续围绕当前位置变化，避免属性面板操作造成视觉位移。
   *
   * @private
   * @param {Object} properties 图片属性补丁。
   * @returns {boolean} 是否保留世界中心。
   */
  _shouldPreserveWorldCenter(properties) {
    if (
      Object.prototype.hasOwnProperty.call(properties, 'x') ||
      Object.prototype.hasOwnProperty.call(properties, 'y')
    ) {
      return false;
    }

    return [
      'width',
      'height',
      'scalePercentX',
      'scalePercentY',
      'rotation',
      'flippedX',
      'flippedY'
    ].some((key) => Object.prototype.hasOwnProperty.call(properties, key));
  }

  /**
   * 尺寸或旋转更新后补偿图片位置，使世界坐标中心保持不变。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @param {{ x: number, y: number } | null} center 更新前世界中心。
   * @returns {void}
   */
  _restoreImageWorldCenter(image, center) {
    if (![center?.x, center?.y].every(Number.isFinite)) {
      return;
    }

    const nextCenter = this._getImageWorldCenter(image);
    image.moveWorld(center.x - nextCenter.x, center.y - nextCenter.y);
    image.updateLayout?.();
  }

  /**
   * 接管新 Blob URL，并释放不再使用的旧 Blob URL。
   *
   * @private
   * @param {string} previousUrl 替换前资源 URL。
   * @param {{ url: string, ownedObjectUrl: boolean }} imageSource 新资源。
   * @returns {void}
   */
  _commitObjectUrlReplacement(previousUrl, imageSource) {
    if (imageSource.ownedObjectUrl) {
      this._ownedObjectUrls.add(imageSource.url);
    }

    if (previousUrl !== imageSource.url && this._ownedObjectUrls.delete(previousUrl)) {
      URL.revokeObjectURL(previousUrl);
    }
  }

  /**
   * 替换失败时释放尚未交给节点持有的 Blob URL。
   *
   * @private
   * @param {{ url: string, ownedObjectUrl: boolean } | null} imageSource 新资源。
   * @returns {void}
   */
  _revokeUncommittedObjectUrl(imageSource) {
    if (imageSource?.ownedObjectUrl && !this._ownedObjectUrls.has(imageSource.url)) {
      URL.revokeObjectURL(imageSource.url);
    }
  }

  /**
   * 通知应用层图片资源替换完成。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @param {'contain' | 'cover' | 'stretch'} fit 适配方式。
   * @returns {void}
   */
  _notifyImageReplaced(image, fit) {
    const properties = this._createPropertiesSnapshot(image);

    this._context.eventBus.emit('image:replaced', { image, fit, properties });
    this._context.eventBus.emit('image:updated', { image, properties });
    this._emitSelectionChanged();
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
      locked: Boolean(image.locked),
      fit: this.getFit(image)
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

  /**
   * 复制图片节点时同步不可序列化的原图尺寸、适配方式和源地址。
   *
   * @private
   * @param {{ pairs?: Array<{ source: Object, clone: Object }> }} payload 复制节点映射。
   * @returns {void}
   */
  _copyDuplicatedRuntimeState(payload) {
    (payload?.pairs ?? []).forEach(({ source, clone }) => {
      if (!(source instanceof LeaferImage) || !(clone instanceof LeaferImage)) {
        return;
      }

      const sourceUrl = this.getSource(source);
      clone[ORIGINAL_WIDTH_KEY] = source[ORIGINAL_WIDTH_KEY];
      clone[ORIGINAL_HEIGHT_KEY] = source[ORIGINAL_HEIGHT_KEY];
      clone[IMAGE_FIT_KEY] = source[IMAGE_FIT_KEY];
      clone[IMAGE_SOURCE_URL_KEY] = sourceUrl;
      clone[IMAGE_SOURCE_FORMAT_KEY] = source[IMAGE_SOURCE_FORMAT_KEY]
        ?? (isSvgImageSource(sourceUrl) ? 'svg' : 'image');
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
