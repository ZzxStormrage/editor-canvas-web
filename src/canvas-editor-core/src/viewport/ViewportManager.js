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
   * @param {ZoomSource} [params.source='api'] — 缩放来源
   */
  zoom({ scale, anchorX, anchorY, source = 'api' }) {
    const curZoom = this.#state.zoom;
    const newZoom = MathHelper.within(
      curZoom * scale,
      this.#state.zoomOptions.min,
      this.#state.zoomOptions.max
    );

    if (newZoom === curZoom) return;

    const ratio = newZoom / curZoom;

    // 锚点缩放：调整 stage 位移，让锚点在视觉上不移动
    if (anchorX != null && anchorY != null) {
      const sx = this.#stage.x;
      const sy = this.#stage.y;
      this.#stage.x = anchorX - (anchorX - sx) * ratio;
      this.#stage.y = anchorY - (anchorY - sy) * ratio;
    }

    this.#stage.scale = newZoom;
    this.#state.zoom = newZoom;   // 触发 Proxy → 自动 emit 事件
    this.#bus.emit('viewport:zoom-source', { source, zoom: newZoom });
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
   * @param {number} [padding=0] 可视区域内边距。
   * @returns {void}
   */
  fitArtboardToView(padding = 0) {
    const viewportBounds = this.#getViewportBounds(padding);
    const artboardBounds = this.#getArtboardBounds();
    const fitZoom = Math.min(
      viewportBounds.width / artboardBounds.width,
      viewportBounds.height / artboardBounds.height
    );

    this.#zoomToArtboardCenter(fitZoom, 'fit');
  }

  /**
   * 不改变缩放，仅将画板中心对齐到当前可视区域中心。
   *
   * @returns {void}
   */
  centerArtboard() {
    this.#stage.scale = this.#state.zoom;
    this.#centerStageOnArtboard(this.#state.zoom);
  }

  /**
   * 缩放并让白色画板中心对齐可视区域中心。
   *
   * @param {number} nextZoom 目标缩放倍数。
   * @param {ZoomSource} [source='button'] 缩放来源。
   * @returns {void}
   */
  #zoomToArtboardCenter(nextZoom, source = 'button') {
    const curZoom = this.#state.zoom;
    const targetZoom = MathHelper.within(
      nextZoom,
      this.#state.zoomOptions.min,
      this.#state.zoomOptions.max
    );

    this.#stage.scale = targetZoom;
    this.#centerStageOnArtboard(targetZoom);

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
   * @returns {void}
   */
  #centerStageOnArtboard(zoom) {
    const viewportCenter = this.#getViewportCenter();
    const artboardCenter = this.#getArtboardCenter();

    this.#stage.x = viewportCenter.x - artboardCenter.x * zoom;
    this.#stage.y = viewportCenter.y - artboardCenter.y * zoom;
  }

  /**
   * 获取当前画布容器的视觉中心点。
   *
   * @returns {{ x: number, y: number }} 可视区域中心点。
   */
  #getViewportCenter() {
    const bounds = this.#getViewportBounds();

    return {
      x: bounds.width / 2,
      y: bounds.height / 2
    };
  }

  /**
   * 获取当前画布容器可用尺寸。
   *
   * @param {number} [padding=0] 可视区域内边距。
   * @returns {{ width: number, height: number }} 可用尺寸。
   */
  #getViewportBounds(padding = 0) {
    const bounds = this.#view?.getBoundingClientRect?.();
    const width = bounds?.width ?? this.#state.width;
    const height = bounds?.height ?? this.#state.height;

    return {
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
    const interaction = this.#leafer.interaction;
    if (!interaction) return;

    // ── 滚轮策略 ──
    interaction.wheel = (data) => {
      const result = this.#strategies.wheel.handle(data, interaction.config.wheel);
      if (result) this.zoom({ ...result, source: 'wheel' });
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

  // ═══════════════════ 销毁 ═══════════════════

  destroy() {
    this.#cleanups.forEach(fn => fn());
    this.#cleanups = [];
  }
}
