import { Group, Rect } from 'leafer-ui';
import { EditorEvent, EditorMoveEvent, EditorScaleEvent } from '@leafer-in/editor';

import { EditorError } from '../../../errors/editor-error.js';
import { getElementDataContainer } from '../../../utils/element-data.js';
import { detectTransparentBounds } from '../../../utils/image-alpha.js';
import {
  isProductionFileAreaLabel,
  PRODUCTION_FILE_AREA_LABEL
} from '../../../utils/production-area.js';
import {
  convertOffsetToParentSpace,
  resolvePrintAreaAlignmentOffset
} from '../../../utils/production-alignment.js';
import { isTextElement } from '../../../utils/text.js';

const MASK_SOURCE_KEY = '__canvasEditorMaskSource';
const PRINT_AREA_KEY = '__canvasEditorPrintArea';
const MASK_LABEL = '遮罩图';
const BACKGROUND_LABEL = '背景图';
const DEFAULT_PRINT_AREA = { width: 300, height: 200 };

/**
 * 生产辅助插件。
 *
 * 独立管理遮罩标记、透明区域识别、打印区域和区域截图，不参与编辑器常规图片、
 * 文字和图层流程。
 */
export class ProductionPlugin {
  constructor() {
    /** @private @type {Object | null} */
    this._context = null;
    /** @private @type {boolean} */
    this._productionAreaPreviewEnabled = false;
    /** @private @type {Function[]} */
    this._unsubscribers = [];
  }

  /** @returns {string} 插件 ID。 */
  get id() {
    return 'production';
  }

  /** @returns {string} 插件名称。 */
  get name() {
    return 'Production';
  }

  /** @returns {string[]} 插件依赖。 */
  get dependencies() {
    return ['elementData'];
  }

  /**
   * 绑定打印区域变换事件。
   *
   * @param {Object} context 编辑器上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this._context = context;
    context.innerEditor?.on_(EditorEvent.SELECT, this._emitPrintAreaChanged, this);
    context.innerEditor?.on_(EditorMoveEvent.MOVE, this._emitPrintAreaChanged, this);
    context.innerEditor?.on_(EditorScaleEvent.SCALE, this._emitPrintAreaChanged, this);
    this._unsubscribers = [
      context.eventBus.on('document:loaded', this._emitPrintAreaChanged.bind(this)),
      context.eventBus.on('document:cleared', () => {
        this._productionAreaPreviewEnabled = false;
        this._emitPrintAreaChanged();
      })
    ];
  }

  /**
   * 设置是否仅预览生产文件区域内的内容。
   *
   * 该状态只控制画板视觉裁剪，不修改节点 visible、统一 JSON 或撤销历史。
   *
   * @param {boolean} enabled 是否开启。
   * @returns {boolean} 最终开启状态。
   */
  setProductionAreaPreview(enabled) {
    this._assertReady();
    const nextEnabled = enabled === true;

    if (nextEnabled && !this._getPrintArea()) {
      throw new EditorError('请先创建生产文件区域。', 'PRINT_AREA_REQUIRED');
    }

    this._productionAreaPreviewEnabled = nextEnabled;
    this._syncProductionAreaPreview();
    return this._productionAreaPreviewEnabled;
  }

  /**
   * 切换生产文件区域预览。
   *
   * @returns {boolean} 切换后的开启状态。
   */
  toggleProductionAreaPreview() {
    return this.setProductionAreaPreview(!this._productionAreaPreviewEnabled);
  }

  /**
   * 查询是否仅预览生产文件区域。
   *
   * @returns {boolean} 是否开启。
   */
  isProductionAreaPreviewEnabled() {
    return this._productionAreaPreviewEnabled;
  }

  /**
   * 把图片标记为生产遮罩图，并移除旧遮罩。
   *
   * @param {Object} image Leafer 图片节点。
   * @param {File | Blob | string | null} [source=null] 本地识别优先使用的图片来源。
   * @returns {Object} 遮罩图片节点。
   */
  markMask(image, source = null) {
    this._assertReady();

    if (!this._isImage(image)) {
      throw new EditorError('Mask target must be an image.', 'MASK_IMAGE_REQUIRED');
    }

    this._getMaskImages().filter((item) => item !== image).forEach((item) => item.remove());
    image[MASK_SOURCE_KEY] = source;
    image.customType = MASK_LABEL;
    image.name = MASK_LABEL;

    const container = getElementDataContainer(image, true);
    container.attributes = {
      ...container.attributes,
      image: {
        ...(container.attributes.image ?? {}),
        role: 'mask'
      }
    };
    this._context.eventBus.emit('element-data:changed', {
      element: image,
      elementId: container.elementId,
      attributes: container.attributes
    });
    this._context.eventBus.emit('production:mask-changed', { image });
    return image;
  }

  /**
   * 恢复文档节点的生产辅助运行时标记。
   *
   * @param {Object} target Leafer 节点。
   * @param {Object} source 文档节点数据。
   * @returns {Object} 原节点。
   */
  restoreDocumentState(target, source) {
    const attributes = getElementDataContainer(target)?.attributes ?? {};
    const label = source.customType ?? source.name;

    if (attributes.image?.role === 'mask') {
      target[MASK_SOURCE_KEY] = source.url ?? null;
    }

    if (isProductionFileAreaLabel(label)) {
      target[PRINT_AREA_KEY] = true;
      target.customType = PRODUCTION_FILE_AREA_LABEL;
      target.name = PRODUCTION_FILE_AREA_LABEL;
    }

    return target;
  }

  /**
   * 创建或重置唯一打印区域。
   *
   * @param {{ x?: number, y?: number, width?: number, height?: number }} [options={}] 画板相对位置和尺寸。
   * @returns {Rect} 打印区域节点。
   */
  createPrintArea(options = {}) {
    this._assertReady();
    const existing = this._getPrintArea();

    if (existing) {
      this.updatePrintArea(options);
      this._context.innerEditor?.select(existing);
      return existing;
    }

    const artboard = this._getArtboardBounds();
    const width = this._positive(options.width, Math.min(DEFAULT_PRINT_AREA.width, artboard.width));
    const height = this._positive(options.height, Math.min(DEFAULT_PRINT_AREA.height, artboard.height));
    const x = this._finite(options.x, (artboard.width - width) / 2);
    const y = this._finite(options.y, (artboard.height - height) / 2);
    const printArea = new Rect({
      x: artboard.x + x,
      y: artboard.y + y,
      width,
      height,
      fill: 'rgba(124, 58, 237, 0.14)',
      stroke: '#7c3aed',
      strokeWidth: 2,
      editable: true,
      draggable: true,
      lockRatio: false,
      editConfig: {
        editSize: 'size',
        lockRatio: false,
        rotateable: false,
        skewable: false
      }
    });

    printArea[PRINT_AREA_KEY] = true;
    printArea.customType = PRODUCTION_FILE_AREA_LABEL;
    printArea.name = PRODUCTION_FILE_AREA_LABEL;
    getElementDataContainer(printArea, true);
    this._context.contentLayer.add(printArea);
    this._context.innerEditor?.select(printArea);
    this._context.artboard?.syncAllElements?.();
    this._emitPrintAreaChanged();
    return printArea;
  }

  /**
   * 获取打印区域画板相对属性。
   *
   * @returns {{ x: number, y: number, width: number, height: number } | null} 打印区域。
   */
  getPrintAreaProperties() {
    const printArea = this._getPrintArea();

    if (!printArea) {
      return null;
    }

    const artboard = this._getArtboardBounds();
    const bounds = this._getNodeBoundsInContent(printArea);
    return {
      x: this._round(bounds.x - artboard.x),
      y: this._round(bounds.y - artboard.y),
      width: this._round(bounds.width),
      height: this._round(bounds.height)
    };
  }

  /**
   * 更新打印区域位置和尺寸。
   *
   * @param {{ x?: number, y?: number, width?: number, height?: number }} properties 画板相对属性。
   * @returns {Rect} 打印区域节点。
   */
  updatePrintArea(properties = {}) {
    this._assertReady();
    const printArea = this._getPrintArea() ?? this.createPrintArea(properties);
    const artboard = this._getArtboardBounds();
    const patch = { rotation: 0 };

    if (properties.x !== undefined) patch.x = artboard.x + this._number(properties.x, 'x');
    if (properties.y !== undefined) patch.y = artboard.y + this._number(properties.y, 'y');
    if (properties.width !== undefined) {
      patch.width = this._positiveNumber(properties.width, 'width');
      patch.scaleX = 1;
    }
    if (properties.height !== undefined) {
      patch.height = this._positiveNumber(properties.height, 'height');
      patch.scaleY = 1;
    }

    printArea.set?.(patch);
    printArea.forceUpdate?.();
    printArea.updateLayout?.();
    this._context.innerEditor?.update?.();
    this._context.innerEditor?.updateEditBox?.();
    this._context.artboard?.syncAllElements?.();
    this._emitPrintAreaChanged();
    return printArea;
  }

  /**
   * 将当前单选图片或文字的视觉外框对齐到打印区域。
   *
   * @param {'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom'} alignment
   * 对齐方式。
   * @returns {Object} 已移动的图片或文字节点。
   */
  alignSelectionToPrintArea(alignment) {
    this._assertReady();
    const printArea = this._getPrintArea();
    const target = this._getAlignableSelection();

    if (!printArea) {
      throw new EditorError('请先创建生产文件区域。', 'PRINT_AREA_REQUIRED');
    }
    if (target.locked) {
      throw new EditorError('请先解锁当前元素。', 'PRINT_AREA_ALIGNMENT_TARGET_LOCKED');
    }

    const targetBounds = this._getNodeBoundsInContent(target);
    const printAreaBounds = this._getNodeBoundsInContent(printArea);
    const contentOffset = resolvePrintAreaAlignmentOffset(
      targetBounds,
      printAreaBounds,
      alignment
    );

    this._moveNodeByContentOffset(target, contentOffset);
    this._context.eventBus.emit('production:selection-aligned', {
      target,
      alignment,
      printArea: printAreaBounds,
      bounds: this._getNodeBoundsInContent(target)
    });
    return target;
  }

  /** 删除打印区域。 @returns {void} */
  removePrintArea() {
    const printArea = this._getPrintArea();

    if (printArea) {
      if (this._context.innerEditor?.hasItem?.(printArea)) {
        this._context.innerEditor.cancel();
      }
      printArea.remove();
      this._context.artboard?.syncAllElements?.();
      this._emitPrintAreaChanged();
    }
  }

  /**
   * 根据遮罩图最大内部透明区域创建或更新打印区域。
   *
   * @param {{ alphaThreshold?: number, maxAnalysisSize?: number }} [options={}] 识别选项。
   * @returns {Promise<{ x: number, y: number, width: number, height: number }>} 打印区域属性。
   */
  async detectPrintAreaFromMask(options = {}) {
    this._assertReady();
    const mask = this._getMaskImages().at(-1);

    if (!mask) {
      throw new EditorError('请先上传遮罩图。', 'MASK_IMAGE_REQUIRED');
    }

    try {
      const source = mask[MASK_SOURCE_KEY] ?? mask.image?.view ?? mask.url;
      const transparentBounds = await detectTransparentBounds(source, options);
      const mappedBounds = this._mapImagePixelsToContent(mask, transparentBounds);
      const properties = this._clampBoundsToArtboard(mappedBounds);

      this.createPrintArea(properties);
      this.updatePrintArea(properties);
      this._context.eventBus.emit('production:mask-detected', {
        mask,
        transparentBounds,
        printArea: this._getPrintArea(),
        properties
      });
      return this.getPrintAreaProperties();
    } catch (error) {
      if (error instanceof EditorError) {
        throw error;
      }
      throw new EditorError(error.message || '遮罩图识别失败。', 'MASK_DETECTION_FAILED');
    }
  }

  /**
   * 截取打印区域，转为 File，并可通过调用方注入的上传方法返回接口结果。
   *
   * @param {{
   *   includeBackground?: boolean,
   *   includeMask?: boolean,
   *   type?: string,
   *   quality?: number,
   *   pixelRatio?: number,
   *   fileName?: string,
   *   fill?: string,
   *   upload?: ((file: File) => Promise<*> | *)
   * }} [options={}] 截图选项。
   * @returns {Promise<File | *>} File 或上传接口结果。
   */
  async capturePrintArea(options = {}) {
    this._assertReady();
    const printArea = this._getPrintArea();

    if (!printArea) {
      throw new EditorError('请先添加或识别生产文件区域。', 'PRINT_AREA_REQUIRED');
    }

    const bounds = this._getNodeBoundsInContent(printArea);
    return this._captureBounds(bounds, options, {
      includeBackground: false,
      includeMask: false,
      fileNamePrefix: 'print-area',
      errorCode: 'PRINT_AREA_CAPTURE_FAILED',
      errorMessage: '生产文件区域截图失败。'
    });
  }

  /**
   * 截取完整画板，转为 File，并可通过调用方注入的上传方法返回接口结果。
   *
   * 默认包含背景图和遮罩图，但始终排除打印区域边框与吸附辅助线。
   *
   * @param {{
   *   includeBackground?: boolean,
   *   includeMask?: boolean,
   *   type?: string,
   *   quality?: number,
   *   pixelRatio?: number,
   *   fileName?: string,
   *   fill?: string,
   *   upload?: ((file: File) => Promise<*> | *)
   * }} [options={}] 截图选项。
   * @returns {Promise<File | *>} File 或上传接口结果。
   */
  async captureCanvas(options = {}) {
    this._assertReady();
    return this._captureBounds(this._getArtboardBounds(), options, {
      includeBackground: true,
      includeMask: true,
      fileNamePrefix: 'canvas',
      fill: this._context.artboard?.options?.fill ?? '#ffffff',
      errorCode: 'CANVAS_CAPTURE_FAILED',
      errorMessage: '完整画板截图失败。'
    });
  }

  /**
   * 按指定画板坐标范围执行离屏截图。
   *
   * @private
   * @param {{ x: number, y: number, width: number, height: number }} bounds 截图范围。
   * @param {Object} options 调用方截图选项。
   * @param {Object} defaults 截图默认值和错误信息。
   * @returns {Promise<File | *>} File 或上传接口结果。
   */
  async _captureBounds(bounds, options, defaults) {
    const captureOptions = {
      includeBackground: defaults.includeBackground,
      includeMask: defaults.includeMask,
      fill: defaults.fill,
      ...options
    };
    const format = this._normalizeImageFormat(options.type);
    const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
    const exportRoot = this._createCaptureRoot(captureOptions);

    try {
      await import('@leafer-in/export');
      const result = await exportRoot.export(format, {
        blob: true,
        quality: this._quality(options.quality),
        pixelRatio: this._positive(options.pixelRatio, 1),
        screenshot: bounds,
        fill: captureOptions.fill
      });

      if (result.error || !(result.data instanceof Blob)) {
        throw result.error ?? new Error('截图没有生成有效文件。');
      }

      const fileName = options.fileName || `${defaults.fileNamePrefix}-${Date.now()}.${format}`;
      const file = new File([result.data], fileName, { type: mimeType });
      return typeof options.upload === 'function' ? await options.upload(file) : file;
    } catch (error) {
      if (error instanceof EditorError) {
        throw error;
      }
      throw new EditorError(error.message || defaults.errorMessage, defaults.errorCode);
    } finally {
      exportRoot.destroy();
    }
  }

  /** 清理插件事件和引用。 @returns {void} */
  destroy() {
    this._context?.innerEditor?.off_(EditorEvent.SELECT, this._emitPrintAreaChanged, this);
    this._context?.innerEditor?.off_(EditorMoveEvent.MOVE, this._emitPrintAreaChanged, this);
    this._context?.innerEditor?.off_(EditorScaleEvent.SCALE, this._emitPrintAreaChanged, this);
    this._unsubscribers.forEach((unsubscribe) => unsubscribe());
    this._context?.artboard?.setContentPreviewBounds?.(null);
    this._unsubscribers = [];
    this._productionAreaPreviewEnabled = false;
    this._context = null;
  }

  /** @private @returns {Object[]} */
  _getMaskImages() {
    return (this._context?.contentLayer?.children ?? []).filter((element) => {
      return this._isImage(element) && getElementDataContainer(element)?.attributes?.image?.role === 'mask';
    });
  }

  /** @private @returns {Rect | null} */
  _getPrintArea() {
    return (this._context?.contentLayer?.children ?? []).find((element) => {
      const label = element?.customType ?? element?.name;
      return element?.[PRINT_AREA_KEY] === true || isProductionFileAreaLabel(label);
    }) ?? null;
  }

  /** @private @returns {Object} 当前严格单选的图片或文字节点。 */
  _getAlignableSelection() {
    const selected = this._context?.innerEditor?.list ?? [];
    const target = selected.length === 1 ? selected[0] : null;

    if (!target || (!this._isImage(target) && !isTextElement(target))) {
      throw new EditorError(
        '请选择一个图片或文字元素。',
        'PRINT_AREA_ALIGNMENT_TARGET_REQUIRED'
      );
    }
    return target;
  }

  /**
   * 按内容坐标系偏移移动节点，并刷新选框和画板约束。
   *
   * @private
   * @param {Object} target 目标节点。
   * @param {{ x: number, y: number }} contentOffset 内容坐标系平移量。
   * @returns {void}
   */
  _moveNodeByContentOffset(target, contentOffset) {
    const parentTransform = target.parent?.getTransform?.(this._context.contentLayer) ?? null;
    const offset = convertOffsetToParentSpace(contentOffset, parentTransform);

    target.set?.({
      x: this._finite(target.x, 0) + offset.x,
      y: this._finite(target.y, 0) + offset.y
    });
    target.forceUpdate?.();
    target.updateLayout?.();
    this._context.innerEditor?.update?.();
    this._context.innerEditor?.updateEditBox?.();
    this._context.artboard?.syncAllElements?.();
  }

  /** @private @returns {Group} */
  _createCaptureRoot(options) {
    const root = new Group({ hittable: false });

    (this._context?.contentLayer?.children ?? []).forEach((element) => {
      const clone = this._cloneForCapture(element, options);
      if (clone) root.add(clone);
    });
    return root;
  }

  /** @private @returns {Object | null} */
  _cloneForCapture(element, options) {
    if (this._shouldExcludeFromCapture(element, options)) {
      return null;
    }

    if (!element?.isBranch) {
      const clone = element.clone?.() ?? null;
      return this._context?.pluginManager
        ?.get('svgRasterCache')
        ?.restoreCloneSource?.(element, clone) ?? clone;
    }

    const clone = element.clone?.({ children: [] });
    (element.children ?? []).forEach((child) => {
      const childClone = this._cloneForCapture(child, options);
      if (childClone) clone?.add?.(childClone);
    });
    return clone;
  }

  /** @private @returns {boolean} */
  _shouldExcludeFromCapture(element, options) {
    const label = element?.customType ?? element?.name;
    if (
      !element
      || element.__snapGuide
      || element[PRINT_AREA_KEY]
      || isProductionFileAreaLabel(label)
    ) {
      return true;
    }

    const role = getElementDataContainer(element)?.attributes?.image?.role;
    if ((role === 'background' || label === BACKGROUND_LABEL) && options.includeBackground !== true) {
      return true;
    }
    if ((role === 'mask' || label === MASK_LABEL) && options.includeMask !== true) {
      return true;
    }
    return false;
  }

  /** @private @returns {{ x: number, y: number, width: number, height: number }} */
  _mapImagePixelsToContent(image, pixels) {
    const imageWidth = this._positive(image.width ?? image.__?.width, pixels.sourceWidth);
    const imageHeight = this._positive(image.height ?? image.__?.height, pixels.sourceHeight);
    const localBounds = {
      x: pixels.x / pixels.sourceWidth * imageWidth,
      y: pixels.y / pixels.sourceHeight * imageHeight,
      width: pixels.width / pixels.sourceWidth * imageWidth,
      height: pixels.height / pixels.sourceHeight * imageHeight
    };
    return this._transformBounds(localBounds, this._getNodeTransform(image));
  }

  /** @private @returns {{ x: number, y: number, width: number, height: number }} */
  _getNodeBoundsInContent(node) {
    const width = this._positive(node.width ?? node.__?.width, 1);
    const height = this._positive(node.height ?? node.__?.height, 1);
    return this._transformBounds({ x: 0, y: 0, width, height }, this._getNodeTransform(node));
  }

  /** @private @returns {{ a: number, b: number, c: number, d: number, e: number, f: number }} */
  _getNodeTransform(node) {
    return node.getTransform?.(this._context.contentLayer) ?? {
      a: this._finite(node.scaleX, 1),
      b: 0,
      c: 0,
      d: this._finite(node.scaleY, 1),
      e: this._finite(node.x, 0),
      f: this._finite(node.y, 0)
    };
  }

  /** @private @returns {{ x: number, y: number, width: number, height: number }} */
  _transformBounds(bounds, transform) {
    const points = [
      this._transformPoint(bounds.x, bounds.y, transform),
      this._transformPoint(bounds.x + bounds.width, bounds.y, transform),
      this._transformPoint(bounds.x, bounds.y + bounds.height, transform),
      this._transformPoint(bounds.x + bounds.width, bounds.y + bounds.height, transform)
    ];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(...xs) - minX,
      height: Math.max(...ys) - minY
    };
  }

  /** @private @returns {{ x: number, y: number }} */
  _transformPoint(x, y, transform) {
    return {
      x: transform.a * x + transform.c * y + transform.e,
      y: transform.b * x + transform.d * y + transform.f
    };
  }

  /** @private @returns {{ x: number, y: number, width: number, height: number }} */
  _clampBoundsToArtboard(bounds) {
    const artboard = this._getArtboardBounds();
    const left = Math.max(bounds.x, artboard.x);
    const top = Math.max(bounds.y, artboard.y);
    const right = Math.min(bounds.x + bounds.width, artboard.x + artboard.width);
    const bottom = Math.min(bounds.y + bounds.height, artboard.y + artboard.height);

    if (right <= left || bottom <= top) {
      throw new EditorError('识别到的透明区域不在画板范围内。', 'MASK_AREA_OUTSIDE_ARTBOARD');
    }

    return {
      x: left - artboard.x,
      y: top - artboard.y,
      width: right - left,
      height: bottom - top
    };
  }

  /** @private @returns {{ x: number, y: number, width: number, height: number }} */
  _getArtboardBounds() {
    return this._context?.artboard?.getContentBounds?.() ?? {
      x: 0,
      y: 0,
      width: this._context?.state?.width ?? 0,
      height: this._context?.state?.height ?? 0
    };
  }

  /** @private @returns {void} */
  _emitPrintAreaChanged() {
    this._syncProductionAreaPreview();
    this._context?.eventBus.emit('production:print-area-changed', {
      printArea: this._getPrintArea(),
      properties: this.getPrintAreaProperties()
    });
  }

  /**
   * 根据当前生产文件区域同步画板裁剪预览。
   *
   * @private
   * @returns {void}
   */
  _syncProductionAreaPreview() {
    if (!this._context) {
      return;
    }

    const printArea = this._getPrintArea();
    if (this._productionAreaPreviewEnabled && !printArea) {
      this._productionAreaPreviewEnabled = false;
    }

    const bounds = this._productionAreaPreviewEnabled
      ? this._getNodeBoundsInContent(printArea)
      : null;
    this._context.artboard?.setContentPreviewBounds?.(bounds);
    this._context.eventBus.emit('production:area-preview-changed', {
      enabled: this._productionAreaPreviewEnabled,
      bounds
    });
  }

  /** @private @returns {boolean} */
  _isImage(element) {
    return String(element?.tag ?? element?.constructor?.name ?? '').toLowerCase().includes('image');
  }

  /** @private @returns {string} */
  _normalizeImageFormat(type = 'image/png') {
    const value = String(type).toLowerCase();
    if (value.includes('jpeg') || value.includes('jpg')) return 'jpg';
    if (value.includes('webp')) return 'webp';
    return 'png';
  }

  /** @private @returns {number} */
  _quality(value) {
    const quality = value === undefined ? 1 : Number(value);
    return Number.isFinite(quality) ? Math.min(1, Math.max(0, quality)) : 1;
  }

  /** @private @returns {number} */
  _number(value, key) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new EditorError(`printArea.${key} must be a number.`, 'PRINT_AREA_NUMBER_INVALID');
    }
    return number;
  }

  /** @private @returns {number} */
  _positiveNumber(value, key) {
    const number = this._number(value, key);
    if (number <= 0) {
      throw new EditorError(`printArea.${key} must be greater than 0.`, 'PRINT_AREA_SIZE_INVALID');
    }
    return number;
  }

  /** @private @returns {number} */
  _finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /** @private @returns {number} */
  _positive(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  /** @private @returns {number} */
  _round(value) {
    return Number(value.toFixed(2));
  }

  /** @private @returns {void} */
  _assertReady() {
    if (!this._context?.contentLayer || this._context.state?.destroyed) {
      throw new EditorError('ProductionPlugin is not ready.', 'PRODUCTION_PLUGIN_NOT_READY');
    }
  }
}
