import { xhrRequestAdapter } from '@alova/adapter-xhr';
import { createAlova } from 'alova';
import VueHook from 'alova/vue';

import { ApiError } from './api-error.js';

const DEFAULT_API_BASE_URL = '/api';
const DEFAULT_REQUEST_TIMEOUT = 15000;
const RESPONSE_MODE_RAW = 'raw';

const runtimeConfig = {
  getAccessToken: null,
  onUnauthorized: null
};

/**
 * 配置应用运行期间的鉴权行为。
 *
 * @param {Object} [options={}] 客户端运行时配置。
 * @param {(() => string | null | Promise<string | null>) | null} [options.getAccessToken]
 * 获取访问令牌的方法。
 * @param {((error: ApiError) => void | Promise<void>) | null} [options.onUnauthorized]
 * 收到 401 响应时的处理方法。
 * @returns {import('alova').Alova} Alova 客户端实例。
 */
export function configureApiClient(options = {}) {
  validateOptionalHandler(options.getAccessToken, 'getAccessToken');
  validateOptionalHandler(options.onUnauthorized, 'onUnauthorized');

  if ('getAccessToken' in options) {
    runtimeConfig.getAccessToken = options.getAccessToken;
  }
  if ('onUnauthorized' in options) {
    runtimeConfig.onUnauthorized = options.onUnauthorized;
  }

  return alovaClient;
}

/**
 * 创建共享相同拦截器的 Alova 客户端，供不同服务域名独立实例化。
 *
 * @param {Object} [options={}] 客户端配置。
 * @param {string} [options.baseURL] 服务基础地址。
 * @returns {import('alova').Alova} Alova 客户端实例。
 */
export function createAlovaClient(options = {}) {
  return createAlova({
    baseURL: normalizeBaseURL(options.baseURL),
    statesHook: VueHook,
    requestAdapter: xhrRequestAdapter(),
    timeout: DEFAULT_REQUEST_TIMEOUT,
    localCache: { GET: 0 },
    cacheLogger: false,
    beforeRequest: appendAuthorizationHeader,
    responded: {
      onSuccess: handleSuccessResponse,
      onError: handleRequestError
    }
  });
}

/**
 * 项目共享的 Alova 客户端。
 *
 * 默认返回服务端响应体；Method 的 meta.responseMode 设为 raw 时返回完整 XHR 响应。
 */
export const alovaClient = createAlovaClient({
  baseURL: import.meta.env?.VITE_BASE_URL_API
});

/**
 * 给请求追加可选的 Bearer Token，不覆盖调用方显式传入的 Authorization。
 *
 * @param {import('alova').Method} method Alova Method 实例。
 * @returns {Promise<void>}
 */
async function appendAuthorizationHeader(method) {
  if (method.meta?.skipAuth || !runtimeConfig.getAccessToken) {
    return;
  }

  const accessToken = await runtimeConfig.getAccessToken();
  if (!accessToken || hasAuthorizationHeader(method.config.headers)) {
    return;
  }

  method.config.headers.Authorization = `Bearer ${accessToken}`;
}

/**
 * 处理 XHR 成功回调，同时将非 2xx 响应转换为 ApiError。
 *
 * @param {{ status: number, statusText: string, data: *, headers: Object }} response XHR 响应。
 * @param {import('alova').Method} method Alova Method 实例。
 * @returns {Promise<*>} 响应体或完整响应。
 */
async function handleSuccessResponse(response, method) {
  if (response.status >= 200 && response.status < 300) {
    return method.meta?.responseMode === RESPONSE_MODE_RAW ? response : response.data;
  }

  const error = createHttpError(response, method);
  await notifyUnauthorized(error);
  throw error;
}

/**
 * 将网络、超时和主动取消错误转换为 ApiError。
 *
 * @param {*} error 原始请求错误。
 * @param {import('alova').Method} method Alova Method 实例。
 * @returns {Promise<never>}
 */
async function handleRequestError(error, method) {
  if (error instanceof ApiError) {
    throw error;
  }

  throw new ApiError(resolveNetworkErrorMessage(error), {
    code: resolveNetworkErrorCode(error),
    request: createRequestSummary(method),
    cause: error
  });
}

/**
 * 创建 HTTP 状态错误。
 *
 * @param {{ status: number, statusText: string, data: * }} response XHR 响应。
 * @param {import('alova').Method} method Alova Method 实例。
 * @returns {ApiError} 统一错误对象。
 */
function createHttpError(response, method) {
  return new ApiError(resolveHttpErrorMessage(response), {
    code: response.data?.code ?? `HTTP_${response.status}`,
    status: response.status,
    data: response.data,
    request: createRequestSummary(method)
  });
}

/**
 * 通知应用处理未授权状态，处理器异常不会覆盖原请求错误。
 *
 * @param {ApiError} error API 错误。
 * @returns {Promise<void>}
 */
async function notifyUnauthorized(error) {
  if (error.status !== 401 || !runtimeConfig.onUnauthorized) {
    return;
  }

  try {
    await runtimeConfig.onUnauthorized(error);
  } catch (handlerError) {
    console.error('Alova onUnauthorized handler failed.', handlerError);
  }
}

/**
 * 获取 HTTP 错误信息。
 *
 * @param {{ status: number, statusText: string, data: * }} response XHR 响应。
 * @returns {string} 错误信息。
 */
function resolveHttpErrorMessage(response) {
  if (response.status === 401) {
    return '登录已过期，请重新登录。';
  }

  if (typeof response.data === 'string' && response.data.trim()) {
    return response.data;
  }

  return response.data?.message ?? response.data?.msg ?? response.statusText ?? '请求失败。';
}

/**
 * 获取网络错误信息。
 *
 * @param {*} error 原始请求错误。
 * @returns {string} 错误信息。
 */
function resolveNetworkErrorMessage(error) {
  const message = error?.message ?? '';

  if (/timeout/i.test(message)) {
    return '请求超时，请稍后重试。';
  }
  if (/abort/i.test(message)) {
    return '请求已取消。';
  }

  return message || '网络连接异常，请检查网络后重试。';
}

/**
 * 获取网络错误码。
 *
 * @param {*} error 原始请求错误。
 * @returns {string} 网络错误码。
 */
function resolveNetworkErrorCode(error) {
  const message = error?.message ?? '';

  if (/timeout/i.test(message)) {
    return 'API_TIMEOUT';
  }
  if (/abort/i.test(message)) {
    return 'API_ABORTED';
  }

  return 'API_NETWORK_ERROR';
}

/**
 * 创建便于日志记录的请求摘要。
 *
 * @param {import('alova').Method} method Alova Method 实例。
 * @returns {{ type: string, url: string }} 请求摘要。
 */
function createRequestSummary(method) {
  return {
    type: method.type,
    url: `${method.baseURL}${method.url}`
  };
}

/**
 * 判断请求头是否已经包含 Authorization。
 *
 * @param {Object} headers 请求头。
 * @returns {boolean} 是否已配置鉴权头。
 */
function hasAuthorizationHeader(headers) {
  return Object.keys(headers ?? {}).some((key) => key.toLowerCase() === 'authorization');
}

/**
 * 归一化 API 基础地址。
 *
 * @param {string | undefined} value 环境变量中的基础地址。
 * @returns {string} 不以斜杠结尾的基础地址。
 */
function normalizeBaseURL(value) {
  const baseURL = value?.trim() || DEFAULT_API_BASE_URL;
  return baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
}

/**
 * 校验可选回调配置。
 *
 * @param {Function | null | undefined} handler 待校验回调。
 * @param {string} name 配置字段名。
 * @returns {void}
 */
function validateOptionalHandler(handler, name) {
  if (handler !== undefined && handler !== null && typeof handler !== 'function') {
    throw new TypeError(`${name} must be a function, null or undefined.`);
  }
}
