/**
 * 编辑器事件总线。
 *
 * @author zzx
 * @since 2026-06-30
 */
export class EventBus {
  /** @type {Map<string, Set<Function>>} */
  #listeners = new Map();

  /**
   * 订阅事件。
   *
   * @param {string} eventName 事件名，推荐 namespace:event 格式。
   * @param {Function} listener 监听函数。
   * @returns {Function} 取消订阅函数。
   */
  on(eventName, listener) {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }

    this.#listeners.get(eventName).add(listener);

    return () => this.off(eventName, listener);
  }

  /**
   * 取消订阅事件。
   *
   * @param {string} eventName 事件名。
   * @param {Function} listener 监听函数。
   * @returns {void}
   */
  off(eventName, listener) {
    const listeners = this.#listeners.get(eventName);
    listeners?.delete(listener);

    if (listeners?.size === 0) {
      this.#listeners.delete(eventName);
    }
  }

  /**
   * 发布事件。
   *
   * @param {string} eventName 事件名。
   * @param {*} payload 事件数据。
   * @returns {void}
   */
  emit(eventName, payload) {
    const listeners = this.#listeners.get(eventName);

    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[EventBus] ${eventName}`, error);
      }
    });
  }

  /**
   * 清空所有监听。
   *
   * @returns {void}
   */
  clear() {
    this.#listeners.clear();
  }
}
