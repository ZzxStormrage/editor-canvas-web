import { createAlovaClient } from '../core/alova-client.js';

export const XIAOXIANG_API_BASE_URL =
  import.meta.env?.VITE_XIAOXIANG_API_BASE_URL || 'https://xiaoxiang.ele007.com';
export const XIAOXIANG_ASSET_BASE_URL =
  import.meta.env?.VITE_XIAOXIANG_API_PROXY_TARGET || XIAOXIANG_API_BASE_URL;

/** 小象后台服务客户端，域名配置与具体业务路径保持分离。 */
export const xiaoxiangClient = createAlovaClient({
  baseURL: XIAOXIANG_API_BASE_URL
});
