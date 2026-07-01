/**
 * 命令管理器 —— **命令模式**
 *
 * 管理命令的执行和 undo/redo 历史栈。
 *
 * 使用说明：
 *   - editor.execute(new ZoomCommand(1.5))  → 执行并压栈
 *   - editor.undo()                         → 回退
 *   - editor.redo()                         → 前进
 *
 * @author zzx
 * @since 2026-07-01
 */
export class CommandManager {
  /** @type {import('./Command.js').Command[]} */
  #stack = [];
  /** @type {number} — 当前位置指针，stack[0..pointer] 是已执行的 */
  #pointer = -1;
  /** @type {number} — 最大历史步数 */
  #maxSize;
  /** @type {Proxy} */
  #state;
  /** @type {import('../logic/event-bus.js').EventBus} */
  #bus;

  /**
   * @param {Proxy} stateProxy
   * @param {import('../logic/event-bus.js').EventBus} bus
   * @param {number} [maxSize=50]
   */
  constructor(stateProxy, bus, maxSize = 50) {
    this.#state = stateProxy;
    this.#bus = bus;
    this.#maxSize = maxSize;
  }

  /**
   * 执行命令并压入历史栈。
   * @param {import('./Command.js').Command} command
   */
  execute(command) {
    command.execute();

    // 尝试与前一个命令合并
    if (this.#pointer >= 0 && this.#stack[this.#pointer].merge(command)) {
      this.#stack[this.#pointer] = command;
    } else {
      // 清除 redo 栈：当前位置之后的操作被覆盖
      this.#stack.splice(this.#pointer + 1);
      this.#stack.push(command);
      this.#pointer++;
    }

    // 限制历史大小
    if (this.#stack.length > this.#maxSize) {
      this.#stack.shift();
      this.#pointer--;
    }

    this.#bus.emit('history:changed', {
      canUndo: this.canUndo,
      canRedo: this.canRedo
    });
  }

  /** 撤销一步 */
  undo() {
    if (!this.canUndo) return;
    const command = this.#stack[this.#pointer];
    command.undo();
    this.#pointer--;
    this.#bus.emit('history:changed', { canUndo: this.canUndo, canRedo: this.canRedo });
  }

  /** 重做一步 */
  redo() {
    if (!this.canRedo) return;
    this.#pointer++;
    const command = this.#stack[this.#pointer];
    command.redo();
    this.#bus.emit('history:changed', { canUndo: this.canUndo, canRedo: this.canRedo });
  }

  /** 是否可撤销 */
  get canUndo() { return this.#pointer >= 0; }

  /** 是否可重做 */
  get canRedo() { return this.#pointer < this.#stack.length - 1; }

  /** 清空历史 */
  clear() {
    this.#stack = [];
    this.#pointer = -1;
  }

  /** 历史步数 */
  get size() { return this.#stack.length; }
}
