import { Command } from '../Command.js';
import { EditorError } from '../../errors/editor-error.js';

/**
 * 通过公开缩放控制器执行的可撤销缩放命令。
 *
 * 控制器可以是 `Editor` 或其他同时暴露 `zoom` 和 `setZoom()` 的对象。
 * 命令只依赖该最小接口，不访问 Leafer 场景或编辑器私有字段。
 */
export class ZoomCommand extends Command {
  /** @type {{ zoom: number, setZoom: (zoom: number) => * }} */
  #controller;

  /** @type {number} */
  #targetZoom;

  /** @type {number | null} */
  #previousZoom = null;

  /**
   * @param {{ zoom: number, setZoom: (zoom: number) => * }} controller 缩放控制器。
   * @param {number} targetZoom 目标缩放倍数。
   */
  constructor(controller, targetZoom) {
    super();
    assertZoomController(controller);
    this.#controller = controller;
    this.#targetZoom = normalizeZoom(targetZoom);
  }

  /** @returns {void} */
  execute() {
    this.#previousZoom = normalizeZoom(this.#controller.zoom);
    this.#controller.setZoom(this.#targetZoom);
  }

  /** @returns {void} */
  undo() {
    if (this.#previousZoom === null) {
      throw new EditorError(
        '缩放命令尚未执行，无法撤销。',
        'ZOOM_COMMAND_NOT_EXECUTED'
      );
    }

    this.#controller.setZoom(this.#previousZoom);
  }

  /** @returns {void} */
  redo() {
    this.#controller.setZoom(this.#targetZoom);
  }

  /**
   * 合并连续缩放，撤销时直接返回连续操作前的缩放值。
   *
   * @param {Command} command 下一个命令。
   * @returns {boolean} 是否已合并。
   */
  merge(command) {
    if (!(command instanceof ZoomCommand) || command.#controller !== this.#controller) {
      return false;
    }

    this.#targetZoom = command.#targetZoom;
    return true;
  }
}

/** @param {*} controller 缩放控制器。 @returns {void} */
function assertZoomController(controller) {
  if (!controller || typeof controller.setZoom !== 'function') {
    throw new EditorError(
      '缩放命令需要有效的缩放控制器。',
      'ZOOM_CONTROLLER_REQUIRED'
    );
  }
}

/** @param {*} value 缩放倍数。 @returns {number} 有效的正数缩放倍数。 */
function normalizeZoom(value) {
  const zoom = Number(value);

  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new EditorError('缩放倍数必须是正数。', 'ZOOM_VALUE_INVALID');
  }

  return zoom;
}
