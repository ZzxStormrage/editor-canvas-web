import { EditorError } from '../errors/editor-error.js';

/**
 * 可记录到编辑器历史栈的命令基类。
 *
 * 可逆命令必须实现 `execute()` 和 `undo()`。`redo()` 默认重新
 * 执行命令，连续操作需要合并时由子类实现 `merge()`。
 */
export class Command {
  /** @type {boolean} 是否可撤销。 */
  reversible = true;

  /**
   * 执行命令。
   * @returns {void}
   */
  execute() {
    throw new EditorError('命令必须实现 execute()。', 'COMMAND_EXECUTE_REQUIRED');
  }

  /**
   * 撤销命令。
   * 默认不实现，子类按需覆盖。
   * @returns {void}
   */
  undo() {
    if (this.reversible) {
      throw new EditorError('可撤销命令必须实现 undo()。', 'COMMAND_UNDO_REQUIRED');
    }
  }

  /**
   * 重做命令——默认等价于 execute()。
   * @returns {void}
   */
  redo() {
    return this.execute();
  }

  /**
   * 合并相邻的同类命令（可选优化）。
   * 例如连续缩放可合并为一个命令。
   *
   * 实现方需要把下一个命令的最终状态合并到当前命令。
   *
   * @param {Command} _command 下一个命令。
   * @returns {boolean} 是否已合并；合并成功时历史栈不新增记录。
   */
  merge(_command) {
    return false;
  }
}
