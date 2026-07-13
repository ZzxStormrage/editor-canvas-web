const IMAGE_ROLE_LABELS = Object.freeze({
  background: '背景',
  mask: '遮罩',
  'ai-variable': 'AI'
});

const LAYER_TYPE_ICONS = Object.freeze({
  text: 'mdi-format-text',
  image: 'mdi-image-outline',
  rect: 'mdi-vector-square',
  shape: 'mdi-shape-outline'
});

/** @param {string} role 图片业务用途。 */
export function getImageRoleLabel(role) {
  return IMAGE_ROLE_LABELS[role] ?? '';
}

/** @param {string} type 图层 DTO 类型。 */
export function resolveLayerIcon(type) {
  return LAYER_TYPE_ICONS[type] ?? LAYER_TYPE_ICONS.shape;
}
