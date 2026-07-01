/**
 * 命令基类 —— **命令模式**
 *
 * 所有编辑器操作封装为 Command，支持：
 *   - execute() — 执行操作
 *   - undo()    — 撤销
 *   - redo()    — 重做
 *
 * 子类必须实现 execute() 和 undo()。
 * 如果 undo() 未重写且操作不可逆，命令不可压入历史栈。
 *
 * 设计动机：《JavaScript设计模式与开发实践》第12章
 *   - 命令模式将请求封装为对象，实现参数化、队列化、可撤销
 *   - 是编辑器 undo/redo 的标准做法
 *
 * @author zzx
 * @since 2026-07-01
 */
export class Command {
  /** @type {boolean} — 是否可撤销 */
  reversible = true;

  /**
   * 执行命令。
   * @returns {void}
   */
  execute() {
    throw new Error('Command.execute() must be overridden.');
  }

  /**
   * 撤销命令。
   * 默认不实现，子类按需覆盖。
   * @returns {void}
   */
  undo() {
    if (this.reversible) {
      throw new Error('Reversible command must override undo().');
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
   * @param {Command} _cmd — 下一个命令
   * @returns {boolean} — true 表示合并成功，历史栈不会新增
   */
  merge(_cmd) {
    return false;
  }
}
