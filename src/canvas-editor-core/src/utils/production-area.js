export const PRODUCTION_FILE_AREA_LABEL = '生产文件区域';

const LEGACY_PRINT_AREA_LABEL = '打印区域';

/**
 * 判断节点名称是否属于生产文件区域，兼容旧模板中的“打印区域”。
 *
 * @param {*} value 节点名称或自定义类型。
 * @returns {boolean} 是否为生产文件区域名称。
 */
export function isProductionFileAreaLabel(value) {
  return value === PRODUCTION_FILE_AREA_LABEL || value === LEGACY_PRINT_AREA_LABEL;
}
