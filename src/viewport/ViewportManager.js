/**
 * 视口缩放管理器 —— **策略模式**
 *
 * 将缩放交互逻辑集中管理，不再直接 patch leafer 内部对象。
 *
 * 策略接口：
 *   WheelZoomStrategy   — 鼠标滚轮 / 触控板滚动
 *   PinchZoomStrategy   — 移动端双指捏合
 *
 * 设计动机：《JavaScript设计模式与开发实践》第5章
 *   - 策略模式将一组算法封装为可互换的策略对象
 *   - 新增缩放方式（如按钮点击）无需修改现有代码
 *
 * @author zzx
 * @since 2026-07-01
 */

import { MathHelper } from 'leafer-ui';
import { WheelZoomStrategy } from './strategies/WheelZoomStrategy.js';
import { PinchZoomStrategy } from './strategies/PinchZoomStrategy.js';

/**
 * @typedef {'wheel' | 'pinch' | 'api' | 'button' | 'fit'} ZoomSource
 */
const WHEEL_PAN_SPEED = 0.65;
const CENTER_TRANSITION_MS = 280;

export class ViewportManager {
  /** @type {import('leafer-ui').Leafer} */
  #leafer;
  /** @type {HTMLElement} */
  #view;
  /** @type {import('leafer-ui').Group} */
  #stage;
  /** @type {Proxy} — EditorState proxy */
  #state;
  /** @type {import('../logic/event-bus.js').EventBus} */
  #bus;

  /** @type {Object} — 缩放策略注册表 */
  #strategies;

  /** @type {Function[]} — cleanup 函数列表 */
  #cleanups;
  /** @type {number} */
  #centerAnimationFrame = 0;

  /**
   * @param {import('leafer-ui').Leafer} leafer
   * @param {HTMLElement} view
   * @param {import('leafer-ui').Group} stage
   * @param {Proxy} stateProxy
   * @param {import('../logic/event-bus.js').EventBus} bus
   */
  constructor(leafer, view, stage, stateProxy, bus) {
    this.#leafer = leafer;
    this.#view = view;
    this.#stage = stage;
    this.#state = stateProxy;
    this.#bus = bus;
    this.#cleanups = [];

    this.#strategies = {
      wheel: new WheelZoomStrategy(),
      pinch: new PinchZoomStrategy(),
    };
  }

  // ═══════════════════ 核心缩放引擎 ═══════════════════

  /**
   * 执行缩放 —— 所有策略最终调用的统一入口。
   *
   * 缩放以锚点 (anchorX, anchorY) 为中心，保持该点在视觉上不动。
   *
   * @param {Object} params
   * @param {number} params.scale — 缩放因子（>1 放大，<1 缩小）
   * @param {number} [params.anchorX] — 缩放锚点 X（画布坐标系）
   * @param {number} [params.anchorY] — 缩放锚点 Y（画布坐标系）
   * @param {number} [params.previousAnchorX] — 上一帧缩放锚点 X。
   * @param {number} [params.previousAnchorY] — 上一帧缩放锚点 Y。
   * @param {ZoomSource} [params.source='api'] — 缩放来源
   */
  zoom({ scale, anchorX, anchorY, previousAnchorX, previousAnchorY, source = 'api' }) {
    this.#cancelCenterAnimation();
    const curZoom = this.#state.zoom;
    const newZoom = MathHelper.within(
      curZoom * scale,
      this.#state.zoomOptions.min,
      this.#state.zoomOptions.max
    );
    const ratio = newZoom / curZoom;
    const hasAnchor = [anchorX, anchorY].every(Number.isFinite);
    const fromAnchorX = Number.isFinite(previousAnchorX) ? previousAnchorX : anchorX;
    const fromAnchorY = Number.isFinite(previousAnchorY) ? previousAnchorY : anchorY;
    const hasAnchorMovement = hasAnchor && (
      fromAnchorX !== anchorX || fromAnchorY !== anchorY
    );

    if (newZoom === curZoom && !hasAnchorMovement) return;

    const previousStageX = this.#stage.x;
    const previousStageY = this.#stage.y;

    // 从上一帧锚点连续变换到当前锚点，同时保留双指平移。
    if (hasAnchor) {
      const sx = this.#stage.x;
      const sy = this.#stage.y;
      this.#stage.x = anchorX - (fromAnchorX - sx) * ratio;
      this.#stage.y = anchorY - (fromAnchorY - sy) * ratio;
    }

    this.#stage.scale = newZoom;
    if (newZoom !== curZoom) {
      this.#state.zoom = newZoom;   // 触发 Proxy → 自动 emit 事件
      this.#bus.emit('viewport:zoom-source', { source, zoom: newZoom });
    } else {
      this.#emitPanChanged(previousStageX, previousStageY);
    }
  }

  // ═══════════════════ API 缩放 ═══════════════════

  /** @param {number} z */
  setZoom(z) {
    this.#state.zoom = z;
    this.#stage.scale = this.#state.zoom;
  }

  /** @param {number} [step] */
  zoomIn(step) {
    this.#zoomToArtboardCenter(this.#state.zoom + (step ?? this.#state.zoomOptions.step));
  }

  /** @param {number} [step] */
  zoomOut(step) {
    this.#zoomToArtboardCenter(this.#state.zoom - (step ?? this.#state.zoomOptions.step));
  }

  /** 重置到初始缩放 */
  resetZoom() {
    this.#zoomToArtboardCenter(this.#state.zoomOptions.initial);
  }

  /**
   * 按当前 canvas-view 大小缩放画板并居中显示。
   *
   * 数字参数保持旧调用方式，等价于 `{ padding }`。`viewportRatio` 控制画板
   * 最长边占可用视口的比例，例如 0.8 表示占据 80%。`expandZoomRange`
   * 用于图片驱动画板尺寸等场景，确保极大或极小画板仍能精确适配。
   *
   * @param {number | { padding?: number, viewportRatio?: number, expandZoomRange?: boolean, viewport?: Object }} [options=0] 适配选项。
   * @returns {void}
   */
  fitArtboardToView(options = 0) {
    const { padding, viewportRatio, expandZoomRange, viewport } = normalizeFitOptions(options);
    const viewportBounds = this.#getViewportBounds(padding, viewport);
    const artboardBounds = this.#getArtboardBounds();
    const fitZoom = Math.min(
      viewportBounds.width / artboardBounds.width,
      viewportBounds.height / artboardBounds.height
    ) * viewportRatio;

    if (expandZoomRange) {
      this.#state.zoomOptions = {
        ...this.#state.zoomOptions,
        min: Math.min(this.#state.zoomOptions.min, fitZoom),
        max: Math.max(this.#state.zoomOptions.max, fitZoom)
      };
    }

    this.#zoomToArtboardCenter(fitZoom, 'fit', { viewport: viewportBounds });
  }

  /**
   * 不改变缩放，将画板指定方向对齐到当前可视区域中心。
   *
   * @param {{ horizontal?: boolean, vertical?: boolean, viewport?: Object, animate?: boolean }} [options={}] 居中选项。
   * @returns {void}
   */
  centerArtboard(options = {}) {
    this.#cancelCenterAnimation();
    this.#stage.scale = this.#state.zoom;
    const target = this.#getCenteredStagePosition(this.#state.zoom, options);

    if (options.animate) {
      this.#animateStagePosition(target.x, target.y);
    } else {
      this.#stage.x = target.x;
      this.#stage.y = target.y;
    }
  }

  /**
   * 按视口像素增量平移画布，不改变缩放和文档元素坐标。
   *
   * @param {number} deltaX 水平移动距离。
   * @param {number} deltaY 垂直移动距离。
   * @returns {void}
   */
  panBy(deltaX, deltaY) {
    const x = Number(deltaX);
    const y = Number(deltaY);

    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
      return;
    }

    this.#cancelCenterAnimation();
    this.#stage.x += x;
    this.#stage.y += y;
    this.#bus.emit('viewport:pan-changed', {
      x: this.#stage.x,
      y: this.#stage.y,
      deltaX: x,
      deltaY: y
    });
  }

  /**
   * 平移点阵工作区。背景为无边界画布，因此不对平移位置做钳制。
   *
   * @param {number} deltaX 水平移动距离。
   * @param {number} deltaY 垂直移动距离。
   * @returns {void}
   */
  panArtboard(deltaX, deltaY) {
    this.panBy(deltaX, deltaY);
  }

  /**
   * 缩放并让白色画板中心对齐可视区域中心。
   *
   * @param {number} nextZoom 目标缩放倍数。
   * @param {ZoomSource} [source='button'] 缩放来源。
   * @returns {void}
   */
  #zoomToArtboardCenter(nextZoom, source = 'button', options = {}) {
    this.#cancelCenterAnimation();
    const curZoom = this.#state.zoom;
    const targetZoom = MathHelper.within(
      nextZoom,
      this.#state.zoomOptions.min,
      this.#state.zoomOptions.max
    );

    this.#stage.scale = targetZoom;
    this.#centerStageOnArtboard(targetZoom, options);

    if (targetZoom === curZoom) {
      return;
    }

    this.#state.zoom = targetZoom;
    this.#bus.emit('viewport:zoom-source', { source, zoom: targetZoom });
  }

  /**
   * 按当前画板中心重新定位 stage，保证按钮缩放后画板居中。
   *
   * @param {number} zoom 当前缩放倍数。
   * @param {{ horizontal?: boolean, vertical?: boolean, viewport?: { x?: number, y?: number, width: number, height: number } }} [options={}] 居中方向和可见视口。
   * @returns {void}
   */
  #centerStageOnArtboard(zoom, options = {}) {
    const target = this.#getCenteredStagePosition(zoom, options);
    const shouldCenterHorizontally = options.horizontal !== false;
    const shouldCenterVertically = options.vertical !== false;

    if (shouldCenterHorizontally) {
      this.#stage.x = target.x;
    }
    if (shouldCenterVertically) {
      this.#stage.y = target.y;
    }
  }

  /**
   * 计算画板在目标视口中心时的 stage 坐标。
   * @param {number} zoom 当前缩放。
   * @param {Object} options 居中选项。
   * @returns {{ x: number, y: number }} 目标 stage 坐标。
   */
  #getCenteredStagePosition(zoom, options = {}) {
    const viewportCenter = this.#getViewportCenter(options.viewport);
    const artboardCenter = this.#getArtboardCenter();

    return {
      x: options.horizontal === false
        ? this.#stage.x
        : viewportCenter.x - artboardCenter.x * zoom,
      y: options.vertical === false
        ? this.#stage.y
        : viewportCenter.y - artboardCenter.y * zoom
    };
  }

  /**
   * 通过缓动平移视口，并逐帧同步画布覆盖层。
   * @param {number} x 目标水平位置。
   * @param {number} y 目标垂直位置。
   * @returns {void}
   */
  #animateStagePosition(x, y) {
    const fromX = this.#stage.x;
    const fromY = this.#stage.y;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || (fromX === x && fromY === y)) {
      this.#stage.x = x;
      this.#stage.y = y;
      this.#emitPanChanged(fromX, fromY);
      return;
    }

    const startedAt = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / CENTER_TRANSITION_MS);
      const eased = 1 - (1 - progress) ** 3;
      const previousX = this.#stage.x;
      const previousY = this.#stage.y;
      this.#stage.x = fromX + (x - fromX) * eased;
      this.#stage.y = fromY + (y - fromY) * eased;
      this.#emitPanChanged(previousX, previousY);

      if (progress < 1) {
        this.#centerAnimationFrame = requestAnimationFrame(step);
      } else {
        this.#centerAnimationFrame = 0;
      }
    };

    this.#centerAnimationFrame = requestAnimationFrame(step);
  }

  /** 取消正在运行的视口居中动画。 */
  #cancelCenterAnimation() {
    if (!this.#centerAnimationFrame) return;
    cancelAnimationFrame(this.#centerAnimationFrame);
    this.#centerAnimationFrame = 0;
  }

  /**
   * 位置变化时发布平移事件。
   *
   * @param {number} previousX 上一个水平位置。
   * @param {number} previousY 上一个垂直位置。
   * @returns {void}
   */
  #emitPanChanged(previousX, previousY) {
    const deltaX = this.#stage.x - previousX;
    const deltaY = this.#stage.y - previousY;

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    this.#bus.emit('viewport:pan-changed', {
      x: this.#stage.x,
      y: this.#stage.y,
      deltaX,
      deltaY
    });
  }

  /**
   * 获取当前画布容器的视觉中心点。
   *
   * @returns {{ x: number, y: number }} 可视区域中心点。
   */
  #getViewportCenter(viewportBounds = this.#getViewportBounds()) {

    return {
      x: viewportBounds.x + viewportBounds.width / 2,
      y: viewportBounds.y + viewportBounds.height / 2
    };
  }

  /**
   * 获取当前画布容器可用尺寸。
   *
   * @param {number} [padding=0] 可视区域内边距。
   * @param {{ x?: number, y?: number, width: number, height: number }} [viewport] 指定的可用区域。
   * @returns {{ x: number, y: number, width: number, height: number }} 可用视口边界。
   */
  #getViewportBounds(padding = 0, viewport) {
    if (viewport && Number(viewport.width) > 0 && Number(viewport.height) > 0) {
      return {
        x: Number(viewport.x ?? 0) + padding,
        y: Number(viewport.y ?? 0) + padding,
        width: Math.max(1, Number(viewport.width) - padding * 2),
        height: Math.max(1, Number(viewport.height) - padding * 2)
      };
    }

    const bounds = this.#view?.getBoundingClientRect?.();
    const width = bounds?.width > 0 ? bounds.width : this.#state.width;
    const height = bounds?.height > 0 ? bounds.height : this.#state.height;

    return {
      x: padding,
      y: padding,
      width: Math.max(1, width - padding * 2),
      height: Math.max(1, height - padding * 2)
    };
  }

  /**
   * 获取白色画板在内容坐标系中的边界。
   *
   * @returns {{ x: number, y: number, width: number, height: number }} 画板边界。
   */
  #getArtboardBounds() {
    const artboard = this.#state.artboard ?? {};

    return {
      x: Number(artboard.x ?? 0),
      y: Number(artboard.y ?? 0),
      width: Number(artboard.width ?? this.#state.width),
      height: Number(artboard.height ?? this.#state.height)
    };
  }

  /**
   * 获取白色画板在内容坐标系中的中心点。
   *
   * @returns {{ x: number, y: number }} 画板中心点。
   */
  #getArtboardCenter() {
    const artboard = this.#getArtboardBounds();
    const x = Number(artboard.x ?? 0);
    const y = Number(artboard.y ?? 0);

    return {
      x: x + artboard.width / 2,
      y: y + artboard.height / 2
    };
  }

  // ═══════════════════ 安装交互 ═══════════════════

  /**
   * 在 leafer 的 interaction 实例上安装缩放策略。
   *
   * 不再直接修改 interaction 对象，而是通过 adapter 函数桥接。
   */
  setupInteraction() {
    this.#disableNativeBrowserZoom();

    const interaction = this.#leafer.interaction;
    if (!interaction) return;

    // ── 滚轮策略 ──
    interaction.wheel = (data) => {
      if (data.ctrlKey || data.metaKey) {
        const result = this.#strategies.wheel.handle(data, interaction.config.wheel);
        if (result) this.zoom({ ...result, source: 'wheel' });
        return;
      }

      this.panArtboard(
        -Number(data.deltaX || 0) * WHEEL_PAN_SPEED,
        -Number(data.deltaY || 0) * WHEEL_PAN_SPEED
      );
    };

    // ── 双指捏合策略 ──
    interaction.multiTouch = (_data, list) => {
      const result = this.#strategies.pinch.handle(list);
      if (result) this.zoom({ ...result, source: 'pinch' });
    };

    // ── 统一缩放入口（Safari gesturechange 等） ──
    interaction.zoom = (data) => {
      if (data.scale) {
        this.zoom({
          scale: data.scale,
          anchorX: data.x,
          anchorY: data.y,
          source: 'api'
        });
      }
    };

    interaction.transformEnd = () => {
      this.#bus.emit('viewport:transform-end', { zoom: this.#state.zoom });
    };
  }

  /**
   * 将画布上的缩放手势交由编辑器处理，并在销毁时恢复原样式。
   * @returns {void}
   */
  #disableNativeBrowserZoom() {
    const previousTouchAction = this.#view.style.touchAction;
    const previousOverscrollBehavior = this.#view.style.overscrollBehavior;
    /** @param {WheelEvent | Event} event 原生缩放手势事件。 @returns {void} */
    const preventBrowserZoom = (event) => event.preventDefault();
    const gestureOptions = { capture: true, passive: false };
    const gestureEvents = ['wheel', 'gesturestart', 'gesturechange', 'gestureend'];

    this.#view.style.touchAction = 'none';
    this.#view.style.overscrollBehavior = 'none';
    gestureEvents.forEach((type) => {
      this.#view.addEventListener(type, preventBrowserZoom, gestureOptions);
    });
    this.#cleanups.push(() => {
      gestureEvents.forEach((type) => {
        this.#view.removeEventListener(type, preventBrowserZoom, true);
      });
      if (this.#view.style.touchAction === 'none') {
        this.#view.style.touchAction = previousTouchAction;
      }
      if (this.#view.style.overscrollBehavior === 'none') {
        this.#view.style.overscrollBehavior = previousOverscrollBehavior;
      }
    });
  }

  // ═══════════════════ 销毁 ═══════════════════

  destroy() {
    this.#cancelCenterAnimation();
    this.#cleanups.forEach(fn => fn());
    this.#cleanups = [];
  }
}

/**
 * @param {number | { padding?: number, viewportRatio?: number, expandZoomRange?: boolean, viewport?: Object }} options
 * @returns {{ padding: number, viewportRatio: number, expandZoomRange: boolean, viewport?: Object }}
 */
function normalizeFitOptions(options) {
  if (typeof options === 'number') {
    return {
      padding: Math.max(0, Number.isFinite(options) ? options : 0),
      viewportRatio: 1,
      expandZoomRange: false,
      viewport: undefined
    };
  }

  const padding = Number(options?.padding ?? 0);
  const viewportRatio = Number(options?.viewportRatio ?? 1);

  return {
    padding: Math.max(0, Number.isFinite(padding) ? padding : 0),
    viewportRatio: MathHelper.within(
      Number.isFinite(viewportRatio) ? viewportRatio : 1,
      0.05,
      1
    ),
    expandZoomRange: options?.expandZoomRange === true,
    viewport: options?.viewport
  };
}
