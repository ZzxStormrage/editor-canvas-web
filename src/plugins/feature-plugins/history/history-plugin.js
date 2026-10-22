import {
  EditorMoveEvent,
  EditorRotateEvent,
  EditorScaleEvent,
  EditorSkewEvent
} from '@leafer-in/editor';

import { EditorError } from '../../../errors/editor-error.js';
import { cloneSerializable } from '../../../utils/editor-document.js';

const DEFAULT_HISTORY_SIZE = 50;
const DEFAULT_RECORD_DELAY = 180;
const MUTATION_EVENTS = Object.freeze([
  'artboard:fill-changed',
  'artboard:resized',
  'document:cleared',
  'element-data:changed',
  'element-data:visibility-changed',
  'image:added',
  'image:replaced',
  'image:updated',
  'layers:changed',
  'selection:deleted',
  'selection:group-changed',
  'selection:layer-changed',
  'text:added',
  'text:replaced',
  'text:updated'
]);

/**
 * 使用统一编辑器文档快照管理设计内容的撤销和重做。
 *
 * 视口缩放、选区和 hover 不属于设计内容，不会进入历史。移动、缩放和
 * 文字输入会延迟合并，避免每一帧都生成历史记录。
 */
export class HistoryPlugin {
  /** @type {Object | null} */
  #context = null;

  /** @type {Object[]} */
  #past = [];

  /** @type {Object[]} */
  #future = [];

  /** @type {Object | null} */
  #present = null;

  /** @type {string} */
  #presentKey = '';

  /** @type {number} */
  #maxSize;

  /** @type {number} */
  #recordDelay;

  /** @type {ReturnType<typeof setTimeout> | null} */
  #recordTimer = null;

  /** @type {Function[]} */
  #unsubscribeEvents = [];

  /** @type {string | string[] | null} */
  #transformEventIds = null;

  /** @type {boolean} */
  #restoring = false;

  /**
   * @param {{ maxSize?: number, recordDelay?: number }} [options={}] 历史配置。
   */
  constructor(options = {}) {
    this.#maxSize = normalizePositiveInteger(
      options.maxSize ?? DEFAULT_HISTORY_SIZE,
      'HISTORY_SIZE_INVALID'
    );
    this.#recordDelay = normalizePositiveInteger(
      options.recordDelay ?? DEFAULT_RECORD_DELAY,
      'HISTORY_DELAY_INVALID'
    );
  }

  /** @returns {string} 插件 ID。 */
  get id() {
    return 'history';
  }

  /** @returns {string} 插件名称。 */
  get name() {
    return 'History';
  }

  /** @returns {string[]} 插件依赖。 */
  get dependencies() {
    return ['document', 'layer'];
  }

  /** @returns {boolean} 当前是否可以撤销。 */
  get canUndo() {
    return !this.#restoring && this.#past.length > 0;
  }

  /** @returns {boolean} 当前是否可以重做。 */
  get canRedo() {
    return !this.#restoring && this.#future.length > 0;
  }

  /** @returns {boolean} 是否正在恢复历史文档。 */
  get restoring() {
    return this.#restoring;
  }

  /**
   * 绑定编辑器写操作和节点变换事件。
   *
   * @param {Object} context 编辑器插件上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this.#context = context;
    this.#unsubscribeEvents = MUTATION_EVENTS.map((eventName) => {
      return context.eventBus.on(eventName, () => this.#scheduleRecord());
    });
    this.#unsubscribeEvents.push(
      context.eventBus.on('document:loaded', ({ document }) => {
        if (!this.#restoring) {
          this.reset(document);
        }
      })
    );

    this.#transformEventIds = context.innerEditor?.on_([
      [EditorMoveEvent.MOVE, this.#scheduleRecord, this],
      [EditorScaleEvent.SCALE, this.#scheduleRecord, this],
      [EditorRotateEvent.ROTATE, this.#scheduleRecord, this],
      [EditorSkewEvent.SKEW, this.#scheduleRecord, this]
    ]);

    queueMicrotask(() => {
      if (this.#context && !this.#present) {
        this.reset();
      }
    });
  }

  /**
   * 将当前文档设为新历史起点。
   *
   * @param {Object | null} [document=null] 已知文档；未传入时导出当前画布。
   * @returns {void}
   */
  reset(document = null) {
    this.#assertReady();
    this.#clearRecordTimer();
    const snapshot = cloneSerializable(document ?? this.#exportDocument());

    this.#past = [];
    this.#future = [];
    this.#present = snapshot;
    this.#presentKey = serializeSnapshot(snapshot);
    this.#emitChanged();
  }

  /**
   * 撤销一步设计内容。
   *
   * @returns {Promise<boolean>} 是否成功撤销。
   */
  async undo() {
    this.#flushPendingRecord();
    if (!this.canUndo) {
      return false;
    }

    const target = this.#past[this.#past.length - 1];
    const current = this.#present;
    await this.#restore(target);
    this.#past.pop();
    this.#future.push(current);
    this.#setPresent(target);
    this.#emitChanged();
    return true;
  }

  /**
   * 重做一步设计内容。
   *
   * @returns {Promise<boolean>} 是否成功重做。
   */
  async redo() {
    this.#flushPendingRecord();
    if (!this.canRedo) {
      return false;
    }

    const target = this.#future[this.#future.length - 1];
    const current = this.#present;
    await this.#restore(target);
    this.#future.pop();
    this.#past.push(current);
    this.#trimPast();
    this.#setPresent(target);
    this.#emitChanged();
    return true;
  }

  /** @returns {void} */
  destroy() {
    this.#clearRecordTimer();
    this.#unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribeEvents = [];
    if (this.#transformEventIds) {
      this.#context?.innerEditor?.off_(this.#transformEventIds);
      this.#transformEventIds = null;
    }
    this.#past = [];
    this.#future = [];
    this.#present = null;
    this.#presentKey = '';
    this.#context = null;
  }

  /** @returns {void} */
  #scheduleRecord() {
    if (this.#restoring || !this.#context) {
      return;
    }

    this.#clearRecordTimer();
    this.#recordTimer = setTimeout(() => {
      this.#recordTimer = null;
      this.#recordCurrent();
    }, this.#recordDelay);
  }

  /** @returns {void} */
  #flushPendingRecord() {
    if (!this.#recordTimer) {
      return;
    }

    this.#clearRecordTimer();
    this.#recordCurrent();
  }

  /** @returns {void} */
  #recordCurrent() {
    if (this.#restoring || !this.#context) {
      return;
    }

    const snapshot = this.#exportDocument();
    const snapshotKey = serializeSnapshot(snapshot);
    if (snapshotKey === this.#presentKey) {
      return;
    }

    if (this.#present) {
      this.#past.push(this.#present);
      this.#trimPast();
    }
    this.#future = [];
    this.#present = snapshot;
    this.#presentKey = snapshotKey;
    this.#emitChanged();
  }

  /** @param {Object} snapshot 目标文档。 @returns {Promise<void>} */
  async #restore(snapshot) {
    const documentPlugin = this.#context?.pluginManager?.get('document');
    if (!documentPlugin?.load) {
      throw new EditorError('历史恢复需要 DocumentPlugin。', 'HISTORY_DOCUMENT_PLUGIN_REQUIRED');
    }

    this.#restoring = true;
    this.#emitChanged();
    try {
      await documentPlugin.load(snapshot);
    } catch (error) {
      this.#restoring = false;
      this.#emitChanged();
      throw error;
    }
    this.#restoring = false;
  }

  /** @returns {Object} */
  #exportDocument() {
    const document = this.#context?.pluginManager?.get('document')?.export?.();
    if (!document) {
      throw new EditorError('无法导出历史文档。', 'HISTORY_EXPORT_FAILED');
    }
    return cloneSerializable(document);
  }

  /** @param {Object} snapshot 当前快照。 @returns {void} */
  #setPresent(snapshot) {
    this.#present = cloneSerializable(snapshot);
    this.#presentKey = serializeSnapshot(this.#present);
  }

  /** @returns {void} */
  #trimPast() {
    if (this.#past.length > this.#maxSize) {
      this.#past.splice(0, this.#past.length - this.#maxSize);
    }
  }

  /** @returns {void} */
  #clearRecordTimer() {
    if (this.#recordTimer) {
      clearTimeout(this.#recordTimer);
      this.#recordTimer = null;
    }
  }

  /** @returns {void} */
  #emitChanged() {
    this.#context?.eventBus.emit('history:changed', {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      restoring: this.#restoring
    });
  }

  /** @returns {void} */
  #assertReady() {
    if (!this.#context?.pluginManager) {
      throw new EditorError('历史插件尚未初始化。', 'HISTORY_PLUGIN_NOT_READY');
    }
  }
}

/** @param {Object} snapshot 文档快照。 @returns {string} 稳定比较字符串。 */
function serializeSnapshot(snapshot) {
  return JSON.stringify(snapshot);
}

/** @param {*} value 数字。 @param {string} code 错误码。 @returns {number} 正整数。 */
function normalizePositiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new EditorError('历史配置必须是正整数。', code);
  }
  return number;
}
