import { createAlovaClient } from '../core/alova-client.js';
import {
  clearH5AccessToken,
  notifyH5AuthExpired,
  waitForH5AccessToken
} from '../../services/h5-auth-token.js';
import { XIAOXIANG_API_BASE_URL } from './xiaoxiang-client.js';

/** H5 customer 接口客户端，只读取独立的 H5 Token。 */
export const customerXiaoxiangClient = createAlovaClient({
  baseURL: XIAOXIANG_API_BASE_URL,
  getAccessToken: waitForH5AccessToken,
  onUnauthorized(error) {
    clearH5AccessToken();
    notifyH5AuthExpired(error);
  }
});
