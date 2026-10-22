/**
 * 编辑器统一错误类型。
 *
 * @author zzx
 * @since 2026-06-30
 */
export class EditorError extends Error {
  /**
   * @param {string} message 错误消息。
   * @param {string} code 错误编码。
   */
  constructor(message, code) {
    super(message);
    this.name = 'EditorError';
    this.code = code;
  }
}
