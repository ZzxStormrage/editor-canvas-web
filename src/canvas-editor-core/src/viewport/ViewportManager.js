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
 * @typedef {'wheel' | 'pinch' | 'api' | 'button'} ZoomSource
 */

export class ViewportManager {
  /** @type {import('leafer-ui').Leafer} */
  #leafer;
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
   * @param {import('leafer-ui').Group} stage
   * @param {Proxy} stateProxy
   * @param {import('../logic/event-bus.js').EventBus} bus
   */
  constructor(leafer, stage, stateProxy, bus) {
    this.#leafer = leafer;
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

  // ═══════════════════ API 缩放（无锚点） ═══════════════════

  /** @param {number} z */
  setZoom(z) {
    this.#state.zoom = z;
    this.#stage.scale = this.#state.zoom;
  }

  /** @param {number} [step] */
  zoomIn(step) {
    this.setZoom(this.#state.zoom + (step ?? this.#state.zoomOptions.step));
  }

  /** @param {number} [step] */
  zoomOut(step) {
    this.setZoom(this.#state.zoom - (step ?? this.#state.zoomOptions.step));
  }

  /** 重置到初始缩放 */
  resetZoom() {
    this.setZoom(this.#state.zoomOptions.initial);
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
