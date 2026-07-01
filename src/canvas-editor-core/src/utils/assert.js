import { EditorError } from '../errors/editor-error.js';

/**
 * 断言编辑器未被销毁。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {Object} state 编辑器状态对象。
 * @returns {void}
 * @throws {EditorError} 当编辑器已销毁时抛出。
 */
export function assertNotDestroyed(state) {
  if (state.destroyed) {
    throw new EditorError('Editor has been destroyed.', 'EDITOR_DESTROYED');
  }
}
