const LAYER_TYPE_LABELS = Object.freeze({
  text: '文本',
  image: '图片',
  rect: '图形',
  group: '组合',
  shape: '图形'
});

/**
 * @param {string} type 图层 DTO 类型。
 * @returns {string} 面向运维用户的类型名称。
 */
export function getLayerTypeLabel(type) {
  return LAYER_TYPE_LABELS[type] ?? LAYER_TYPE_LABELS.shape;
}
