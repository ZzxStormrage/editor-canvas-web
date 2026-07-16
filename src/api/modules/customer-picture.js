import { createPictureApi } from './picture.js';

const CUSTOMER_PICTURE_UPLOAD_PATH =
  import.meta.env?.VITE_CUSTOMER_PICTURE_UPLOAD_PATH || '/customer/api/localStorage/pictures';

/** H5 生产页面使用的客户侧图片上传接口。 */
export const customerPictureApi = createPictureApi(
  CUSTOMER_PICTURE_UPLOAD_PATH,
  'customerPicture.upload'
);
