import { EditorError } from '../errors/editor-error.js';

const DEFAULT_HISTORY_SIZE = 50;

/**
 * 管理显式命令的撤销和重做历史。
 *
 * 只有通过 `execute()` 执行的命令会进入历史栈；图片、文字和图层
 * 插件的直接写操作不会自动生成历史。
 */
export class CommandManager {
  /** @type {import('./Command.js').Command[]} */
  #stack = [];

  /** @type {number} 当前已执行命令的索引。 */
  #pointer = -1;

  /** @type {number} */
  #maxSize;

  /** @type {import('../logic/event-bus.js').EventBus} */
  #bus;

  /**
   * @param {import('../logic/event-bus.js').EventBus} bus 编辑器事件总线。
   * @param {number} [maxSize=50] 最大历史步数。
   */
  constructor(bus, maxSize = DEFAULT_HISTORY_SIZE) {
    assertEventBus(bus);
    this.#bus = bus;
    this.#maxSize = normalizeHistorySize(maxSize);
  }

  /**
   * 执行命令并更新历史栈。
   *
   * 不可逆命令执行后会清空旧历史，避免将画布撤销到无法正确
   * 还原的状态。
   *
   * @param {import('./Command.js').Command} command 待执行命令。
   * @returns {void}
   */
  execute(command) {
    assertCommand(command);
    command.execute();

    if (command.reversible === false) {
      this.clear();
      return;
    }

    this.#stack.splice(this.#pointer + 1);
    const currentCommand = this.#stack[this.#pointer];

    if (!currentCommand || currentCommand.merge(command) !== true) {
      this.#stack.push(command);
      this.#pointer += 1;
    }

    this.#trimHistory();
    this.#emitChanged();
  }

  /** @returns {boolean} 是否成功撤销。 */
  undo() {
    if (!this.canUndo) {
      return false;
    }

    const command = this.#stack[this.#pointer];
    command.undo();
    this.#pointer -= 1;
    this.#emitChanged();
    return true;
  }

  /** @returns {boolean} 是否成功重做。 */
  redo() {
    if (!this.canRedo) {
      return false;
    }

    const nextPointer = this.#pointer + 1;
    this.#stack[nextPointer].redo();
    this.#pointer = nextPointer;
    this.#emitChanged();
    return true;
  }

  /** @returns {boolean} 当前是否可以撤销。 */
  get canUndo() {
    return this.#pointer >= 0;
  }

  /** @returns {boolean} 当前是否可以重做。 */
  get canRedo() {
    return this.#pointer < this.#stack.length - 1;
  }

  /** @returns {void} */
  clear() {
    this.#stack = [];
    this.#pointer = -1;
    this.#emitChanged();
  }

  /** @returns {number} 当前历史记录数量。 */
  get size() {
    return this.#stack.length;
  }

  /** @returns {void} */
  #trimHistory() {
    if (this.#stack.length <= this.#maxSize) {
      return;
    }

    const overflow = this.#stack.length - this.#maxSize;
    this.#stack.splice(0, overflow);
    this.#pointer -= overflow;
  }

  /** @returns {void} */
  #emitChanged() {
    this.#bus.emit('history:changed', {
      canUndo: this.canUndo,
      canRedo: this.canRedo
    });
  }
}

/** @param {*} bus 事件总线。 @returns {void} */
function assertEventBus(bus) {
  if (!bus || typeof bus.emit !== 'function') {
    throw new EditorError(
      '命令管理器需要有效的 EventBus。',
      'COMMAND_EVENT_BUS_REQUIRED'
    );
  }
}

/** @param {*} command 命令对象。 @returns {void} */
function assertCommand(command) {
  const methods = ['execute', 'undo', 'redo', 'merge'];
  const isValid = command && methods.every((method) => typeof command[method] === 'function');

  if (!isValid) {
    throw new EditorError(
      '命令必须实现 execute、undo、redo 和 merge。',
      'COMMAND_INVALID'
    );
  }
}

/** @param {*} value 历史步数。 @returns {number} 有效的正整数历史步数。 */
function normalizeHistorySize(value) {
  const size = Number(value);

  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new EditorError('历史步数必须是正整数。', 'COMMAND_HISTORY_SIZE_INVALID');
  }

  return size;
}
