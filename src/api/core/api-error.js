/**
 * API 请求统一错误。
 */
export class ApiError extends Error {
  /**
   * @param {string} message 面向调用方的错误信息。
   * @param {Object} [options={}] 错误上下文。
   * @param {string} [options.code='API_REQUEST_FAILED'] 业务或网络错误码。
   * @param {number} [options.status=0] HTTP 状态码，网络错误为 0。
   * @param {*} [options.data=null] 服务端返回的原始错误数据。
   * @param {{ type: string, url: string } | null} [options.request=null] 请求摘要。
   * @param {*} [options.cause] 原始错误。
   */
  constructor(message, options = {}) {
    super(message);

    this.name = 'ApiError';
    this.code = options.code ?? 'API_REQUEST_FAILED';
    this.status = options.status ?? 0;
    this.data = options.data ?? null;
    this.request = options.request ?? null;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
