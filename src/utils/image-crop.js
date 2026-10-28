/**
 * 计算图片资源在裁剪框局部坐标中的显示位置。
 * @param {Object} options 图片框、原图、适配方式和可选已保存裁剪参数。
 * @returns {{ frameWidth: number, frameHeight: number, left: number, top: number,
 * width: number, height: number, scaleX: number, scaleY: number } | null}
 * 有效的图片内容映射。
 */
export function getImageCropMapping(options = {}) {
  const frameWidth = Number(options.frameWidth);
  const frameHeight = Number(options.frameHeight);
  const sourceWidth = Number(options.sourceWidth);
  const sourceHeight = Number(options.sourceHeight);
  if (![frameWidth, frameHeight, sourceWidth, sourceHeight].every(isPositiveNumber)) return null;

  const saved = options.crop;
  let scaleX;
  let scaleY;
  let left = 0;
  let top = 0;

  if (saved) {
    scaleX = Number(saved.scaleX);
    scaleY = Number(saved.scaleY);
    left = Number(saved.offsetX);
    top = Number(saved.offsetY);
  } else if (options.fit === 'clip' || options.fit === 'normal') {
    scaleX = Number(options.scale?.x ?? options.scale ?? 1);
    scaleY = Number(options.scale?.y ?? options.scale ?? 1);
    left = Number(options.offset?.x ?? 0);
    top = Number(options.offset?.y ?? 0);
  } else if (options.fit === 'contain' || options.fit === 'cover') {
    const scale = options.fit === 'contain'
      ? Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight)
      : Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
    scaleX = scale;
    scaleY = scale;
    left = (frameWidth - sourceWidth * scale) * getAlignRatio(options.align, 'x');
    top = (frameHeight - sourceHeight * scale) * getAlignRatio(options.align, 'y');
    left += Number(options.offset?.x ?? 0);
    top += Number(options.offset?.y ?? 0);
  } else {
    scaleX = frameWidth / sourceWidth;
    scaleY = frameHeight / sourceHeight;
  }

  if (![scaleX, scaleY, left, top].every(Number.isFinite) || scaleX <= 0 || scaleY <= 0) {
    return null;
  }

  return {
    frameWidth,
    frameHeight,
    left,
    top,
    width: sourceWidth * scaleX,
    height: sourceHeight * scaleY,
    scaleX,
    scaleY
  };
}

/**
 * 计算进入裁剪时的初始裁剪框。
 *
 * 取「图片节点框」与「图片实际内容范围」的交集，保证默认裁剪框不会圈进空白。
 *
 * @param {{ frameWidth: number, frameHeight: number, contentLeft: number,
 * contentTop: number, contentWidth: number, contentHeight: number }} frame 图片框与内容范围。
 * @returns {{ left: number, top: number, width: number, height: number }} 初始裁剪框。
 */
export function createInitialCropRect(frame = {}) {
  const frameWidth = Number(frame.frameWidth);
  const frameHeight = Number(frame.frameHeight);
  const left = Math.max(0, Number(frame.contentLeft) || 0);
  const top = Math.max(0, Number(frame.contentTop) || 0);
  const right = Math.min(frameWidth, (Number(frame.contentLeft) || 0) + (Number(frame.contentWidth) || 0));
  const bottom = Math.min(frameHeight, (Number(frame.contentTop) || 0) + (Number(frame.contentHeight) || 0));

  if (!isPositiveNumber(frameWidth) || !isPositiveNumber(frameHeight) || right - left < 1 || bottom - top < 1) {
    return { left: 0, top: 0, width: frameWidth, height: frameHeight };
  }

  return { left, top, width: right - left, height: bottom - top };
}

/**
 * 把用户调整后的裁剪框限制在允许范围内。
 *
 * 默认限制在图片节点框内；传入 `bounds` 时可放宽到图片实际内容范围，
 * 这样放大或 cover 适配后仍能裁剪超出原节点框、但确实有像素的区域。
 *
 * @param {Object} rect 用户裁剪框。
 * @param {number} frameWidth 图片节点局部宽度。
 * @param {number} frameHeight 图片节点局部高度。
 * @param {{ left: number, top: number, width: number, height: number }} [bounds] 允许范围。
 * @returns {{ left: number, top: number, width: number, height: number } | null}
 * 限制后的裁剪框。
 */
export function normalizeImageCropRect(rect, frameWidth, frameHeight, bounds = null) {
  const boundsRect = rect?.crop ?? rect;
  const values = ['left', 'top', 'width', 'height'].map((key) => Number(boundsRect?.[key]));
  if (!values.every(Number.isFinite) || !isPositiveNumber(frameWidth) || !isPositiveNumber(frameHeight)) {
    return null;
  }

  const area = bounds && Number.isFinite(bounds.left) && Number.isFinite(bounds.top)
    ? {
      left: Number(bounds.left),
      top: Number(bounds.top),
      right: Number(bounds.left) + Number(bounds.width),
      bottom: Number(bounds.top) + Number(bounds.height)
    }
    : { left: 0, top: 0, right: Number(frameWidth), bottom: Number(frameHeight) };

  const [left, top, width, height] = values;
  const x = Math.max(area.left, Math.min(left, area.right));
  const y = Math.max(area.top, Math.min(top, area.bottom));
  const right = Math.max(x, Math.min(left + width, area.right));
  const bottom = Math.max(y, Math.min(top + height, area.bottom));
  if (right - x < 1 || bottom - y < 1) return null;
  return { left: x, top: y, width: right - x, height: bottom - y };
}

/**
 * 计算图片内容在图片框局部坐标中的显示范围。
 *
 * 缩放锚点固定为**图片框中心**，与裁剪框位置无关：这样移动裁剪框时图片不会
 * 跟着平移（早期版本以裁剪框中心为锚点，放大后拖框会连带拖动图片）。
 *
 * @param {Object} options 映射、缩放比例和拖拽偏移。
 * @returns {{ left: number, top: number, width: number, height: number }} 内容框。
 */
export function getImageCropContentBox(options = {}) {
  const mapping = options.mapping ?? {};
  const zoom = isPositiveNumber(Number(options.zoom)) ? Number(options.zoom) : 1;
  const panX = Number.isFinite(Number(options.panX)) ? Number(options.panX) : 0;
  const panY = Number.isFinite(Number(options.panY)) ? Number(options.panY) : 0;
  const anchorX = Number(mapping.frameWidth) / 2;
  const anchorY = Number(mapping.frameHeight) / 2;

  return {
    left: anchorX + (Number(mapping.left) + panX - anchorX) * zoom,
    top: anchorY + (Number(mapping.top) + panY - anchorY) * zoom,
    width: Number(mapping.width) * zoom,
    height: Number(mapping.height) * zoom
  };
}

/**
 * 计算确认裁剪后的图片缩放和偏移。
 * @param {Object} options 当前映射、裁剪框、滑杆缩放和拖拽偏移。
 * @returns {{ scaleX: number, scaleY: number, offsetX: number, offsetY: number }}
 * Leafer 图片填充使用的变换。
 */
export function createImageCropTransform(options = {}) {
  const rect = options.rect;
  const mapping = options.mapping;
  const zoom = isPositiveNumber(Number(options.zoom)) ? Number(options.zoom) : 1;
  const box = getImageCropContentBox({
    mapping,
    zoom,
    panX: options.panX,
    panY: options.panY
  });

  return {
    scaleX: mapping.scaleX * zoom,
    scaleY: mapping.scaleY * zoom,
    offsetX: box.left - rect.left,
    offsetY: box.top - rect.top
  };
}

/**
 * 根据一次指针拖动的累计位移计算图片平移，始终相对按下时的位置计算。
 * @param {Object} options 起始平移、指针位移、画布轴向和缩放比例。
 * @returns {{ panX: number, panY: number }} 图片局部坐标中的新平移。
 */
export function getImageCropPan(options = {}) {
  const basisX = options.basisX ?? { x: 1, y: 0 };
  const basisY = options.basisY ?? { x: 0, y: 1 };
  const determinant = basisX.x * basisY.y - basisY.x * basisX.y;
  const zoom = isPositiveNumber(Number(options.zoom)) ? Number(options.zoom) : 1;

  if (Math.abs(determinant) < 0.000001) {
    return {
      panX: Number(options.startPanX) || 0,
      panY: Number(options.startPanY) || 0
    };
  }

  const deltaX = Number(options.deltaX) || 0;
  const deltaY = Number(options.deltaY) || 0;
  const localX = (basisY.y * deltaX - basisY.x * deltaY) / determinant;
  const localY = (-basisX.y * deltaX + basisX.x * deltaY) / determinant;
  const crop = options.crop ?? {
    left: 0,
    top: 0,
    width: Number(options.frameWidth),
    height: Number(options.frameHeight)
  };
  const contentLeft = Number(options.contentLeft) || 0;
  const contentTop = Number(options.contentTop) || 0;
  const contentWidth = Number(options.contentWidth);
  const contentHeight = Number(options.contentHeight);
  let panX = (Number(options.startPanX) || 0) + localX / zoom;
  let panY = (Number(options.startPanY) || 0) + localY / zoom;
  const centerX = crop.left + crop.width / 2;
  const centerY = crop.top + crop.height / 2;

  if (isPositiveNumber(contentWidth) && isPositiveNumber(crop.width)) {
    const renderedWidth = contentWidth * zoom;
    const renderedLeft = centerX + (contentLeft + panX - centerX) * zoom;
    const minimumLeft = renderedWidth >= crop.width
      ? crop.left + crop.width - renderedWidth
      : crop.left;
    const maximumLeft = renderedWidth >= crop.width
      ? crop.left
      : crop.left + crop.width - renderedWidth;
    const boundedLeft = clampNumber(renderedLeft, minimumLeft, maximumLeft);
    panX = centerX - contentLeft + (boundedLeft - centerX) / zoom;
  }

  if (isPositiveNumber(contentHeight) && isPositiveNumber(crop.height)) {
    const renderedHeight = contentHeight * zoom;
    const renderedTop = centerY + (contentTop + panY - centerY) * zoom;
    const minimumTop = renderedHeight >= crop.height
      ? crop.top + crop.height - renderedHeight
      : crop.top;
    const maximumTop = renderedHeight >= crop.height
      ? crop.top
      : crop.top + crop.height - renderedHeight;
    const boundedTop = clampNumber(renderedTop, minimumTop, maximumTop);
    panY = centerY - contentTop + (boundedTop - centerY) / zoom;
  }

  return {
    panX,
    panY
  };
}

/** @private @param {*} value 数值。 @returns {boolean} 是否是正有限数值。 */
function isPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

/** @private @param {number} value 当前值。 @param {number} minimum 最小值。
 * @param {number} maximum 最大值。 @returns {number} 限制后的数值。 */
function clampNumber(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

/** @private @param {string | Object | undefined} align 填充对齐方式。
 * @param {'x' | 'y'} axis 坐标轴。 @returns {number} 对齐比例。 */
function getAlignRatio(align, axis) {
  const value = typeof align === 'string' ? align : 'center';
  const isStart = axis === 'x'
    ? value === 'left' || value === 'top-left' || value === 'bottom-left'
    : value === 'top' || value === 'top-left' || value === 'top-right';
  const isEnd = axis === 'x'
    ? value === 'right' || value === 'top-right' || value === 'bottom-right'
    : value === 'bottom' || value === 'bottom-left' || value === 'bottom-right';
  return isStart ? 0 : isEnd ? 1 : 0.5;
}
