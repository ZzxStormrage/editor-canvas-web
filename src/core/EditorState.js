import { MathHelper } from 'leafer-ui';

import { EditorError } from '../errors/editor-error.js';

/**
 * 编辑器核心状态 —— **代理模式**
 *
 * 使用 Proxy 拦截状态变更，自动执行：
 *  1. 值合法性校验
 *  2. 边界钳位（zoom）
 *  3. EventBus 事件发布
 *
 * 设计动机：《JavaScript设计模式与开发实践》第15章
 *   - 代理模式为对象提供替身，控制对它的访问
 *   - 相比手动在每个 setter 里重复校验代码，Proxy 统一拦截
 *
 * @author zzx
 * @since 2026-06-30
 */
export class EditorState {
  /** @type {import('../logic/event-bus.js').EventBus} */
  #bus;

  /** @type {Object} — 内部原始数据 */
  #raw;

  /** @type {Proxy} — 暴露给外部的代理 */
  proxy;

  /**
   * @param {Object} initial — 初始状态
   * @param {import('../logic/event-bus.js').EventBus} bus — 事件总线
   */
  constructor(initial, bus) {
    this.#bus = bus;
    this.#raw = { ...initial, destroyed: false };
    this.proxy = this.#createProxy();
  }

  // ─────────────────────── 代理工厂 ───────────────────────

  #createProxy() {
    const self = this;

    return new Proxy(this.#raw, {
      set(target, key, value) {
        const old = target[key];

        // 销毁后禁止修改（destroyed 本身除外）
        if (target.destroyed && key !== 'destroyed') {
          throw new EditorError('Editor has been destroyed.', 'EDITOR_DESTROYED');
        }

        // 校验 + 钳位
        const clamped = self.#clamp(key, value, target);

        target[key] = clamped;

        // 发布事件
        self.#emit(key, clamped, old, target);

        return true;
      }
    });
  }

  // ─────────────────────── 校验/钳位 ───────────────────────

  /**
   * 按字段执行校验和边界钳位。
   *
   * @param {string} key — 字段名
   * @param {*} value — 新值
   * @param {Object} target — 当前原始对象
   * @returns {*} 处理后的值
   * @throws {EditorError}
   */
  #clamp(key, value, target) {
    switch (key) {
      case 'zoom':
        return MathHelper.within(Number(value), target.zoomOptions.min, target.zoomOptions.max);
      case 'zoomOptions': {
        const opts = value ?? {};
        if (opts.min > opts.max) {
          throw new EditorError('zoom.min must be <= zoom.max.', 'ZOOM_RANGE_INVALID');
        }
        return { ...target.zoomOptions, ...opts };
      }
      case 'areaType':
        if (value !== 'grid' && value !== 'blank') {
          throw new EditorError('areaType must be "grid" or "blank".', 'AREA_TYPE_INVALID');
        }
        return value;
      case 'showGrid':
        if (typeof value !== 'boolean') {
          throw new EditorError('showGrid must be boolean.', 'SHOW_GRID_INVALID');
        }
        return value;
      default:
        return value;
    }
  }

  // ─────────────────────── 事件发布 ───────────────────────

  /**
   * 状态变更时自动发布对应事件。
   *
   * @param {string} key
   * @param {*} value — 新值
   * @param {*} old — 旧值
   * @param {Object} target — 当前状态
   */
  #emit(key, value, old, target) {
    const map = {
      zoom:          () => this.#bus.emit('viewport:zoom-changed',  { zoom: value, previous: old }),
      background:    () => this.#bus.emit('canvas:background-changed', { background: value }),
      showGrid:      () => this.#bus.emit('canvas:grid-visibility-changed', { showGrid: value }),
      areaType:      () => this.#bus.emit('canvas:area-type-changed',   { areaType: value }),
      grid:          () => this.#bus.emit('canvas:grid-changed',        { grid: value }),
      width:         () => this.#bus.emit('canvas:resized', { width: target.width, height: target.height }),
      height:        () => this.#bus.emit('canvas:resized', { width: target.width, height: target.height }),
    };

    // showGrid 与 areaType 联动
    if (key === 'showGrid' && value !== old) {
      target.areaType = value ? 'grid' : 'blank';
    }
    if (key === 'areaType' && value !== old) {
      target.showGrid = value === 'grid';
    }

    map[key]?.();
  }

  /**
   * 获取原始对象快照（必要时使用，避免绕过代理）。
   *
   * @returns {Object}
   */
  snapshot() {
    return { ...this.#raw };
  }
}
