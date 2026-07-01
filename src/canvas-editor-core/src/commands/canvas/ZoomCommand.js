import { Command } from '../Command.js';

/**
 * 缩放命令 —— 可撤销
 *
 * @author zzx
 * @since 2026-07-01
 */
export class ZoomCommand extends Command {
  /** @type {Proxy} */
  #state;
  /** @type {number} */
  #targetZoom;
  /** @type {number} */
  #previousZoom;

  /**
   * @param {Proxy} stateProxy
   * @param {number} targetZoom — 目标缩放级别
   */
  constructor(stateProxy, targetZoom) {
    super();
    this.reversible = true;
    this.#state = stateProxy;
    this.#targetZoom = targetZoom;
  }

  execute() {
    this.#previousZoom = this.#state.zoom;
    this.#state.zoom = this.#targetZoom;
  }

  undo() {
    this.#state.zoom = this.#previousZoom;
  }
}
