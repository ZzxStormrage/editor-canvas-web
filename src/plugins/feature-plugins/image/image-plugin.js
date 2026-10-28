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
  createImageCropTransform,
  getImageCropContentBox,
  getImageCropMapping,
  normalizeImageCropRect
} from '../../../utils/image-crop.js';
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
const IMAGE_ALIGN_KEY = '__canvasEditorImageAlign';
const DEFERRED_IMAGE_RESOURCE_KEY = '__canvasEditorDeferredImageResource';
const IMAGE_CROP_KEY = '__canvasEditorCropSettings';

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
    /** @private @type {Function | null} */
    this._unsubscribeVisibilityChanged = null;
    /** @private @type {{ image: LeaferImage, opacity: number } | null} */
    this._cropSession = null;
    /** @private @type {WeakMap<Object, { width: number, height: number }>} 裁剪图片最近一次的框尺寸 */
    this._cropFrameSizes = new WeakMap();
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
    context.innerEditor?.on_(EditorScaleEvent.SCALE, this._handleCropFrameScale, this);
    context.innerEditor?.on_(EditorScaleEvent.SCALE, this._emitSelectionChanged, this);
    context.innerEditor?.on_(EditorRotateEvent.ROTATE, this._emitSelectionChanged, this);
    this._unsubscribeDuplicated = context.eventBus.on(
      'selection:duplicated',
      this._copyDuplicatedRuntimeState.bind(this)
    );
    this._unsubscribeVisibilityChanged = context.eventBus.on(
      'element:visibility-changed',
      this._handleVisibilityChanged.bind(this)
    );
    // 裁剪期间文档被替换（撤销、打开项目、清空）或目标被删除时，节点会被销毁，
    // 这里主动结束会话并通知视图层退出遮罩，避免遮罩停留在失效投影上。
    this._unsubscribeCropTarget = [
      'document:loaded',
      'document:cleared',
      'selection:deleted',
      'layers:changed'
    ].map((eventName) => {
      return context.eventBus.on(eventName, () => this._endCropIfTargetLost());
    });
  }

  /**
   * 添加图片到内容图层。
   *
   * 图片 URL / File / Blob 归一化为 URL 后，
   * 使用 {@link Resource.loadImage} 获取原始尺寸。
   * 最终用 leafer-ui 原生 {@link LeaferImage} 渲染。
   *
   * @param {string | File | Blob} source 图片 URL、File 或 Blob。
   * @param {Object} [options={}] 图片放置配置。
   * @param {'contain' | 'cover' | 'stretch'} [options.fit='stretch']
   * 图片在节点外框中的适配方式。
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
      const fit = normalizeImageReplacementFit(options?.fit ?? 'stretch');
      const image = new LeaferImage({
        url: imageSource.url,
        draggable: true,
        editable: true,
        lockRatio: true,
        ...imageConfig
      });

      if (fit !== 'stretch') {
        this._setImageResourceAndFit(image, imageSource.url, fit, 'center');
      }

      image[ORIGINAL_WIDTH_KEY] = imageSize.width;
      image[ORIGINAL_HEIGHT_KEY] = imageSize.height;
      image[IMAGE_FIT_KEY] = fit;
      image[IMAGE_ALIGN_KEY] = 'center';
      image[IMAGE_SOURCE_URL_KEY] = imageSource.url;
      image[IMAGE_SOURCE_FORMAT_KEY] = imageSource.format;
      getElementDataContainer(image, true);
      contentLayer.add(image);
      image.forceUpdate?.();
      image.updateLayout?.();
      if (imageSource.ownedObjectUrl) {
        this._ownedObjectUrls.add(imageSource.url);
      }
      if (shouldSelect) {
        // 等待节点进入 Leafer 渲染管线后再创建选框。
        await waitForRenderFrame();
        this._context.innerEditor?.select(image);
      }
      eventBus.emit('image:added', { image });
      this._context.innerEditor?.update?.();
      this._context.innerEditor?.updateEditBox?.();
      this._context.leafer?.forceRender?.();
      await waitForRenderFrame();

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
   * 替换指定图片节点的资源，并保留节点层级和自定义属性。
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
   * @param {{ deferResource?: boolean }} [options={}] 图片资源恢复选项。
   * @returns {Object} 原图片节点。
   */
  restoreDocumentState(target, source, resource, options = {}) {
    if (!(target instanceof LeaferImage)) {
      return target;
    }

    const fit = normalizeImageReplacementFit(source.objectFit === 'fill' ? 'stretch' : source.objectFit ?? 'stretch');
    const url = source.url ?? this.getSource(target);
    const align = this._resolveDocumentImageAlign(source.objectPosition);

    if (options.deferResource && url) {
      this._clearImageResource(target);
    } else if (source.crop && url) {
      this._setImageCropResource(target, url, source.crop);
    } else {
      this._setImageResourceAndFit(target, url, fit, align);
    }
    target[ORIGINAL_WIDTH_KEY] = Number(source.sourceWidth ?? resource?.width ?? target.width ?? 0);
    target[ORIGINAL_HEIGHT_KEY] = Number(source.sourceHeight ?? resource?.height ?? target.height ?? 0);
    target[IMAGE_FIT_KEY] = fit;
    target[IMAGE_ALIGN_KEY] = align;
    target[IMAGE_SOURCE_URL_KEY] = url;
    target[IMAGE_SOURCE_FORMAT_KEY] = isSvgImageSource(url) ? 'svg' : 'image';
    target[IMAGE_CROP_KEY] = source.crop ? normalizeCropSettings(source.crop) : null;
    target[DEFERRED_IMAGE_RESOURCE_KEY] = Boolean(options.deferResource && url);
    return target;
  }

  /**
   * 激活延迟图片资源，首次显示节点时先完成加载，再写入 Leafer 渲染属性。
   *
   * @param {Object} target 图片节点。
   * @returns {Promise<boolean>} 是否成功激活了延迟资源。
   */
  async activateDeferredSource(target) {
    if (!(target instanceof LeaferImage) || !target[DEFERRED_IMAGE_RESOURCE_KEY]) {
      return false;
    }

    const url = target[IMAGE_SOURCE_URL_KEY];
    if (!url) {
      return false;
    }

    // 1. 加载期间先占用激活状态，避免显隐事件重复创建相同请求。
    target[DEFERRED_IMAGE_RESOURCE_KEY] = false;

    try {
      await Resource.loadImage(url);

      // 2. 异步完成后确认节点仍属于当前资源和可显示状态。
      if (!this._canCommitDeferredSource(target, url)) {
        return false;
      }

      // 3. 资源进入 Leafer 缓存后再绑定 fill，并同步场景和编辑器视图。
      const cropSettings = target[IMAGE_CROP_KEY];
      if (cropSettings) {
        this._setImageCropResource(target, url, cropSettings);
      } else {
        this._setImageResourceAndFit(
          target,
          url,
          target[IMAGE_FIT_KEY] ?? 'stretch',
          target[IMAGE_ALIGN_KEY] ?? 'center'
        );
      }
      target.forceUpdate?.();
      target.updateLayout?.();
      this._context.artboard?.syncAllElements?.();
      this._context.innerEditor?.update?.();
      this._context.eventBus.emit('image:source-activated', { image: target, source: url });
      return true;
    } catch (error) {
      if (
        this._context
        && !this._context.state?.destroyed
        && target.parent
        && target[IMAGE_SOURCE_URL_KEY] === url
        && !target.destroyed
      ) {
        target[DEFERRED_IMAGE_RESOURCE_KEY] = true;
      }
      this._context?.eventBus.emit('image:source-activation-failed', {
        image: target,
        source: url,
        error
      });
      console.warn('[ImagePlugin] Deferred image activation failed.', error);
      return false;
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
   * 开始裁剪当前单选图片，并返回不包含 Leafer 节点引用的预览数据。
   *
   * @returns {Object | null} 裁剪预览数据；未选中可编辑图片时返回 null。
   */
  beginSelectedCrop() {
    this._assertReady();
    const image = this._getSelectedImage();
    if (!image || image.locked || this._cropSession) return null;

    const source = this.getSource(image);
    const mapping = this._getCropImageMapping(image);
    if (!source || !mapping) return null;
    const projection = this._getCropProjection(image, mapping.frameWidth, mapping.frameHeight);
    if (!projection) return null;

    const editBox = this._context.innerEditor?.editBox;
    this._cropSession = {
      image,
      opacity: this._getFiniteNumber(image.opacity, 1),
      editBoxVisible: editBox?.visible !== false
    };
    image.opacity = 0;
    if (editBox) editBox.visible = false;
    // 取消选区：官方编辑框、缩放控制点、旋转按钮和操作按钮都跟随选区显隐，
    // 进入裁剪后必须整体隐藏，避免与裁剪遮罩的选框和控制条叠在一起。
    this._context.innerEditor?.cancel?.();
    // 画板内的不透明预览是内容层的克隆副本，必须同步剔除被隐藏的原图，
    // 否则拖动裁剪框时会在原位留下一张不会移动的“重影”。
    this._context.artboard?.syncAllElements?.();
    this._context.leafer?.forceRender?.();
    return {
      source,
      opacity: this._cropSession.opacity,
      frameWidth: mapping.frameWidth,
      frameHeight: mapping.frameHeight,
      contentLeft: mapping.left,
      contentTop: mapping.top,
      contentWidth: mapping.width,
      contentHeight: mapping.height,
      projection
    };
  }

  /**
   * 读取裁剪预览节点当前在画布宿主内的 CSS 投影。
   *
   * @returns {Object | null} 宿主局部原点和两个局部轴；未处于裁剪时返回 null。
   */
  getCropProjection() {
    const image = this._cropSession?.image;
    if (!image || image.destroyed || !image.parent) return null;
    return this._getCropProjection(image, image.width, image.height);
  }

  /**
   * 确认裁剪并更新原图片节点及可序列化资源变换。
   *
   * @param {{ left: number, top: number, width: number, height: number,
   * zoom: number, panX: number, panY: number }} crop 裁剪窗口与图片变换。
   * @returns {Object | null} 更新后的图片属性；裁剪目标失效时返回 null。
   */
  commitSelectedCrop(crop = {}) {
    const session = this._cropSession;
    const image = session?.image;
    if (!image || image.destroyed || !image.parent) {
      this._restoreCropSession(false, 'target-lost');
      return null;
    }

    const mapping = this._getCropImageMapping(image);
    if (!mapping) {
      this._restoreCropSession(true);
      throw new EditorError('Image crop geometry is invalid.', 'IMAGE_CROP_GEOMETRY_INVALID');
    }
    // 裁剪框允许超出原节点框（放大/cover 后内容会更大），但不能超出预览里看到的
    // 内容范围。这里必须用「缩放 + 拖拽之后」的内容框，否则放大后提交会被截断。
    const contentBox = getImageCropContentBox({
      mapping,
      zoom: crop.zoom,
      panX: crop.panX,
      panY: crop.panY
    });
    const rect = normalizeImageCropRect(crop, mapping.frameWidth, mapping.frameHeight, contentBox);
    if (!rect) {
      this._restoreCropSession(true);
      throw new EditorError('Crop bounds must have a positive size.', 'IMAGE_CROP_BOUNDS_INVALID');
    }

    const settings = normalizeCropSettings(createImageCropTransform({
      mapping,
      rect,
      zoom: crop.zoom,
      panX: crop.panX,
      panY: crop.panY
    }));
    const cropOrigin = image.getWorldPoint({ x: rect.left, y: rect.top });

    image.set({
      url: undefined,
      width: rect.width,
      height: rect.height,
      fill: {
        type: 'image',
        url: this.getSource(image),
        mode: 'clip',
        scale: { x: settings.scaleX, y: settings.scaleY },
        offset: { x: settings.offsetX, y: settings.offsetY }
      }
    });
    image[IMAGE_CROP_KEY] = settings;
    image[IMAGE_FIT_KEY] = 'stretch';
    image[IMAGE_ALIGN_KEY] = 'center';
    // 记录裁剪后的外框尺寸，后续拖角点缩放时按比例同步裁剪映射。
    this._cropFrameSizes.set(image, { width: rect.width, height: rect.height });
    image.forceUpdate?.();
    image.updateLayout?.();
    const nextOrigin = image.getWorldPoint({ x: 0, y: 0 });
    image.moveWorld(cropOrigin.x - nextOrigin.x, cropOrigin.y - nextOrigin.y);
    this._restoreCropSession(false);
    image.opacity = session.opacity;
    image.forceUpdate?.();
    image.updateLayout?.();
    this._context.artboard?.syncAllElements?.();
    this._context.innerEditor?.select?.(image);
    this._context.innerEditor?.update?.();
    this._context.innerEditor?.updateEditBox?.();

    const properties = this._createPropertiesSnapshot(image);
    this._context.eventBus.emit('image:updated', { image, properties, crop: rect });
    this._context.leafer?.forceRender?.();
    this._emitSelectionChanged();
    return properties;
  }

  /**
   * 取消裁剪并还原原图和选区。
   *
   * @returns {boolean} 是否取消了活动裁剪。
   */
  cancelSelectedCrop() {
    if (!this._cropSession) return false;
    this._restoreCropSession(true);
    return true;
  }

  /**
   * 获取节点需要附加到编辑器文档的裁剪映射。
   *
   * @param {LeaferImage} target 图片节点。
   * @returns {{ scaleX: number, scaleY: number, offsetX: number, offsetY: number } | null}
   * 已保存的图片裁剪映射。
   */
  getCropSettings(target) {
    return target instanceof LeaferImage && target[IMAGE_CROP_KEY]
      ? { ...target[IMAGE_CROP_KEY] }
      : null;
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
    this._restoreCropSession(false, 'destroyed');
    this._context?.innerEditor?.off_(EditorEvent.SELECT, this._emitSelectionChanged, this);
    this._context?.innerEditor?.off_(EditorMoveEvent.MOVE, this._emitSelectionChanged, this);
    this._context?.innerEditor?.off_(EditorScaleEvent.SCALE, this._handleCropFrameScale, this);
    this._context?.innerEditor?.off_(EditorScaleEvent.SCALE, this._emitSelectionChanged, this);
    this._context?.innerEditor?.off_(EditorRotateEvent.ROTATE, this._emitSelectionChanged, this);
    this._unsubscribeDuplicated?.();
    this._unsubscribeDuplicated = null;
    this._unsubscribeVisibilityChanged?.();
    this._unsubscribeVisibilityChanged = null;
    (this._unsubscribeCropTarget ?? []).forEach((unsubscribe) => unsubscribe());
    this._unsubscribeCropTarget = [];
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
   * 获取当前严格单选图片，否则抛出编辑器错误。
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
    image[DEFERRED_IMAGE_RESOURCE_KEY] = false;
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
    image[IMAGE_ALIGN_KEY] = align;
    image[IMAGE_CROP_KEY] = null;
  }

  /** @private @param {LeaferImage} image 图片节点。 @param {string} url 图片来源。
   * @param {Object} settings 可序列化的裁剪映射。 @returns {void} */
  _setImageCropResource(image, url, settings) {
    const crop = normalizeCropSettings(settings);
    image.set({
      url: undefined,
      fill: {
        type: 'image',
        url,
        mode: 'clip',
        scale: { x: crop.scaleX, y: crop.scaleY },
        offset: { x: crop.offsetX, y: crop.offsetY }
      }
    });
    image[IMAGE_CROP_KEY] = crop;
    image[IMAGE_SOURCE_URL_KEY] = url;
    // 记录当前外框尺寸，作为后续角点缩放时同步裁剪映射的基准。
    this._cropFrameSizes.set(image, {
      width: this._getPositiveNumber(image.width, 0),
      height: this._getPositiveNumber(image.height, 0)
    });
  }

  /** @private @param {LeaferImage} image 图片节点。
   * @param {number} frameWidth 局部宽度。 @param {number} frameHeight 局部高度。
   * @returns {Object | null} 图片资源在节点局部坐标中的映射。 */
  _getCropImageMapping(image) {
    const frameWidth = this._getPositiveNumber(image.width, 1);
    const frameHeight = this._getPositiveNumber(image.height, 1);
    const sourceWidth = this._getPositiveNumber(
      image[ORIGINAL_WIDTH_KEY] ?? image.image?.width,
      frameWidth
    );
    const sourceHeight = this._getPositiveNumber(
      image[ORIGINAL_HEIGHT_KEY] ?? image.image?.height,
      frameHeight
    );
    const inputFill = image.__?.__input?.fill;
    const paint = Array.isArray(inputFill) ? inputFill[0] : inputFill;
    const mapping = getImageCropMapping({
      frameWidth,
      frameHeight,
      sourceWidth,
      sourceHeight,
      fit: image[IMAGE_CROP_KEY]
        ? 'clip'
        : paint?.mode === 'fit'
          ? 'contain'
          : paint?.mode ?? 'stretch',
      crop: image[IMAGE_CROP_KEY],
      scale: paint?.scale,
      offset: paint?.offset,
      align: paint?.align
    });
    return mapping;
  }

  /** @private @param {LeaferImage} image 图片节点。
   * @param {number} width 图片局部宽度。 @param {number} height 图片局部高度。
   * @returns {Object | null} 图片局部坐标到画布宿主 CSS 坐标的投影。 */
  _getCropProjection(image, width, height) {
    if (![width, height].every((value) => Number.isFinite(value) && value > 0)) return null;
    const points = [
      image.getWorldPoint({ x: 0, y: 0 }),
      image.getWorldPoint({ x: width, y: 0 }),
      image.getWorldPoint({ x: 0, y: height })
    ];
    const toClient = (point) => this._context?.leafer?.getClientPointByWorld?.(point);
    const [origin, horizontal, vertical] = points.map(toClient);
    const view = this._context?.leafer?.view;
    const host = view?.parentElement;
    const hostBounds = host?.getBoundingClientRect?.();

    if (!origin || !horizontal || !vertical || !hostBounds) return null;

    return {
      left: origin.x - hostBounds.left,
      top: origin.y - hostBounds.top,
      basisX: { x: (horizontal.x - origin.x) / width, y: (horizontal.y - origin.y) / width },
      basisY: { x: (vertical.x - origin.x) / height, y: (vertical.y - origin.y) / height }
    };
  }

  /** @private @param {boolean} restoreSelection 是否恢复图片选中状态。
   * @param {string} [reason='finished'] 会话结束原因，随事件通知视图层。
   * @returns {void} */
  _restoreCropSession(restoreSelection, reason = 'finished') {
    const session = this._cropSession;
    if (!session) return;

    this._cropSession = null;
    const { image, opacity } = session;
    if (image && !image.destroyed) {
      image.opacity = opacity;
      image.forceUpdate?.();
      if (restoreSelection && image.parent) this._context?.innerEditor?.select?.(image);
    }
    const editBox = this._context?.innerEditor?.editBox;
    if (editBox) {
      this._context?.innerEditor?.update?.();
      this._context?.innerEditor?.updateEditBox?.();
      editBox.visible = session.editBoxVisible;
    }
    // 恢复原图透明度后重建画板预览副本，保证退出裁剪时原位内容重新出现。
    this._context?.artboard?.syncAllElements?.();
    this._context?.leafer?.forceRender?.();
    this._context?.eventBus?.emit('image:crop-ended', { image, reason });
  }

  /**
   * 裁剪目标被删除或文档被替换时结束会话。
   *
   * @private
   * @returns {void}
   */
  _endCropIfTargetLost() {
    const check = () => {
      const image = this._cropSession?.image;
      if (!image) return;
      if (!image.destroyed && image.parent) return;
      this._restoreCropSession(false, 'target-lost');
    };

    // 删除动作可能在事件之后才真正移除节点，补一次延迟复查。
    check();
    setTimeout(check, 0);
  }

  /** @private @param {LeaferImage} image 图片节点。 @returns {void} */
  _clearImageResource(image) {
    image.set?.({ url: undefined, fill: undefined });
  }

  /**
   * 判断异步加载完成后是否仍可把延迟资源绑定到节点。
   *
   * @private
   * @param {LeaferImage} image 图片节点。
   * @param {string} url 本次加载的图片 URL。
   * @returns {boolean} 是否允许提交资源。
   */
  _canCommitDeferredSource(image, url) {
    const context = this._context;
    if (!context || context.state?.destroyed || image.destroyed || !image.parent) {
      return false;
    }

    if (image[IMAGE_SOURCE_URL_KEY] !== url) {
      return false;
    }

    if (image.visible === false) {
      image[DEFERRED_IMAGE_RESOURCE_KEY] = true;
      return false;
    }

    return true;
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
   * 拖拽选框角点缩放裁剪后的图片时，同步缩放裁剪映射。
   *
   * 裁剪后的图片用 `fill.mode = 'clip'` 渲染，scale/offset 是绝对局部坐标；
   * 只改外框尺寸不会让内容跟着缩放，看起来就是「缩放不生效」或「露出空白」。
   * 这里按外框尺寸变化比例同步缩放 scale 与 offset。
   *
   * @private
   * @param {Object} event 缩放事件。
   * @returns {void}
   */
  _handleCropFrameScale(event) {
    const image = event?.target;
    if (!(image instanceof LeaferImage)) return;
    const crop = image[IMAGE_CROP_KEY];
    if (!crop) return;

    const width = this._getPositiveNumber(image.width, 0);
    const height = this._getPositiveNumber(image.height, 0);
    const previous = this._cropFrameSizes.get(image);

    if (!previous || !width || !height || !previous.width || !previous.height) {
      this._cropFrameSizes.set(image, { width, height });
      return;
    }

    const ratioX = width / previous.width;
    const ratioY = height / previous.height;
    this._cropFrameSizes.set(image, { width, height });
    if (![ratioX, ratioY].every((value) => Number.isFinite(value) && value > 0)) return;
    if (Math.abs(ratioX - 1) < 0.0001 && Math.abs(ratioY - 1) < 0.0001) return;

    const scaled = normalizeCropSettings({
      scaleX: crop.scaleX * ratioX,
      scaleY: crop.scaleY * ratioY,
      offsetX: crop.offsetX * ratioX,
      offsetY: crop.offsetY * ratioY
    });
    this._setImageCropResource(image, this.getSource(image), scaled);
    image.forceUpdate?.();
    image.updateLayout?.();
  }

  /**
   * 发布当前单选图片的属性。
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
   * 显示元素时激活其中尚未加载的图片资源。
   *
   * @private
   * @param {{ elements?: Object[], visible?: boolean }} payload 显隐事件。
   * @returns {void}
   */
  _handleVisibilityChanged(payload) {
    if (payload?.visible !== true) {
      return;
    }

    this._activateDeferredSources(payload.elements ?? []);
  }

  /**
   * 递归激活当前有效显示节点中的延迟图片。
   *
   * @private
   * @param {Object[]} elements 起始节点。
   * @returns {void}
   */
  _activateDeferredSources(elements) {
    elements.forEach((element) => {
      if (element?.visible === false) {
        return;
      }

      void this.activateDeferredSource(element);
      this._activateDeferredSources(element.children ?? []);
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
      clone[IMAGE_ALIGN_KEY] = source[IMAGE_ALIGN_KEY];
      clone[IMAGE_CROP_KEY] = source[IMAGE_CROP_KEY] ? { ...source[IMAGE_CROP_KEY] } : null;
      clone[IMAGE_SOURCE_URL_KEY] = sourceUrl;
      clone[DEFERRED_IMAGE_RESOURCE_KEY] = source[DEFERRED_IMAGE_RESOURCE_KEY] === true;
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

/**
 * 等待一帧，让 Leafer 完成新增节点的布局和绘制。
 * @returns {Promise<void>} 下一帧完成时结束。
 */
function waitForRenderFrame() {
  return new Promise((resolve) => {
    const request = globalThis.requestAnimationFrame ?? ((callback) => setTimeout(callback, 16));
    request(() => resolve());
  });
}

/** @private @param {Object} settings 已保存的裁剪映射。
 * @returns {{ scaleX: number, scaleY: number, offsetX: number, offsetY: number }} */
function normalizeCropSettings(settings) {
  const normalized = {
    scaleX: Number(settings?.scaleX),
    scaleY: Number(settings?.scaleY),
    offsetX: Number(settings?.offsetX),
    offsetY: Number(settings?.offsetY)
  };
  if (!Number.isFinite(normalized.scaleX) || normalized.scaleX <= 0
    || !Number.isFinite(normalized.scaleY) || normalized.scaleY <= 0
    || !Number.isFinite(normalized.offsetX) || !Number.isFinite(normalized.offsetY)) {
    throw new EditorError('Image crop settings are invalid.', 'IMAGE_CROP_SETTINGS_INVALID');
  }
  return normalized;
}
