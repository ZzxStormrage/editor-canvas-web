<template>
  <div
    ref="overlayRoot"
    class="image-crop-overlay"
    role="dialog"
    aria-label="图片裁剪"
    tabindex="0"
    @pointerdown.stop
    @pointermove="movePointer"
    @pointerup="finishPointer"
    @pointercancel="finishPointer"
    @wheel.stop.prevent
    @keydown="handleKeydown"
  >
    <div class="image-crop-overlay__plane" :style="planeStyle">
      <div class="image-crop-overlay__clip" :style="clipStyle" @pointerdown="startImageDrag">
        <img
          class="image-crop-overlay__image"
          :src="state.source"
          :style="imageStyle"
          alt=""
          draggable="false"
          @load="imageLoadError = false"
          @error="imageLoadError = true"
        />
        <div class="image-crop-overlay__mask image-crop-overlay__mask--top" :style="maskStyles.top"></div>
        <div class="image-crop-overlay__mask image-crop-overlay__mask--bottom" :style="maskStyles.bottom"></div>
        <div class="image-crop-overlay__mask image-crop-overlay__mask--left" :style="maskStyles.left"></div>
        <div class="image-crop-overlay__mask image-crop-overlay__mask--right" :style="maskStyles.right"></div>
      </div>
      <div
        class="image-crop-overlay__frame"
        :style="cropStyle"
        @pointerdown="startCropMove"
      >
        <div class="image-crop-overlay__grid" aria-hidden="true"></div>
        <button
          v-for="handle in handles"
          :key="handle.direction"
          class="image-crop-overlay__handle"
          :class="`is-${handle.direction}`"
          type="button"
          :aria-label="handle.label"
          @pointerdown.stop.prevent="startResize($event, handle.direction)"
        ></button>
      </div>
    </div>

    <div ref="controlsRef" class="image-crop-controls" :style="controlsStyle" @pointerdown.stop @keydown.stop>
      <button
        class="image-crop-controls__icon"
        type="button"
        aria-label="取消裁剪"
        title="取消"
        @click="editor.cancelSelectedImageCrop()"
      >
        <v-icon icon="mdi-close" size="19" />
      </button>
      <span class="image-crop-controls__divider" aria-hidden="true"></span>
      <button class="image-crop-controls__auto" type="button" @click="resetCrop">
        <v-icon icon="mdi-crop-free" size="18" />
        自动裁剪
      </button>
      <label
        class="image-crop-controls__zoom"
        :class="{ 'is-dragging': zoomDragging }"
        aria-label="缩放图片"
        :style="{ '--zoom-progress': zoomProgress }"
      >
        <input
          v-model.number="state.zoom"
          type="range"
          :min="MIN_ZOOM"
          :max="MAX_ZOOM"
          step="0.01"
          aria-label="缩放图片"
          @pointerdown="startZoomDrag"
        />
        <span>{{ Math.round(state.zoom * 100) }}%</span>
      </label>
      <button class="image-crop-controls__done" type="button" @click="editor.commitSelectedImageCrop()">
        完成
      </button>
    </div>

    <p v-if="imageLoadError" class="image-crop-overlay__error" role="alert">
      图片预览加载失败，请取消后重试。
    </p>
    <p v-else class="image-crop-overlay__hint">拖动图片调整位置，拖动控制点调整裁剪范围</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { createInitialCropRect, getImageCropContentBox, getImageCropPan } from '../../utils/image-crop.js';

const props = defineProps({
  editor: { type: Object, required: true },
  state: { type: Object, required: true },
  host: { type: Object, required: true }
});

const MIN_CROP_SIZE = 24;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const CONTROLS_GAP = 14;
const CONTROLS_PADDING = 8;
/** 画布工具条（缩放、撤销）高度，控制条需要避开这段区域。 */
const WORKSPACE_TOOLBAR_RESERVE = 68;
const overlayRoot = ref(null);
const controlsRef = ref(null);
const controlsSize = ref({ width: 0, height: 0 });
const imageLoadError = ref(false);
const zoomDragging = ref(false);
const handles = Object.freeze([
  { direction: 'nw', label: '调整裁剪左上角' },
  { direction: 'n', label: '调整裁剪上边缘' },
  { direction: 'ne', label: '调整裁剪右上角' },
  { direction: 'e', label: '调整裁剪右边缘' },
  { direction: 'se', label: '调整裁剪右下角' },
  { direction: 's', label: '调整裁剪下边缘' },
  { direction: 'sw', label: '调整裁剪左下角' },
  { direction: 'w', label: '调整裁剪左边缘' }
]);
let pointerMode = null;
let hostObserver = null;
let controlsObserver = null;
let frameId = 0;
let unsubscribeEvents = [];

const planeStyle = computed(() => {
  const projection = props.state.projection;
  if (!projection) return { display: 'none' };
  return {
    width: `${props.state.frameWidth}px`,
    height: `${props.state.frameHeight}px`,
    transform: `matrix(${projection.basisX.x}, ${projection.basisX.y}, ${projection.basisY.x}, ${projection.basisY.y}, ${projection.left}, ${projection.top})`
  };
});

const imageStyle = computed(() => ({
  left: '0px',
  top: '0px',
  width: '100%',
  height: '100%',
  opacity: props.state.opacity ?? 1
}));

/**
 * 图片内容在图片框局部坐标中的显示范围。
 *
 * 缩放与拖拽都以裁剪框中心为基准，因此内容框可能大于图片框；裁剪预览需要
 * 完整显示这块内容，超出裁剪框的部分由遮罩压暗而不是裁掉。
 *
 * @returns {{ left: number, top: number, width: number, height: number }} 内容框。
 */
const contentBox = computed(() => getImageCropContentBox({
  mapping: {
    frameWidth: props.state.frameWidth,
    frameHeight: props.state.frameHeight,
    left: props.state.contentLeft,
    top: props.state.contentTop,
    width: props.state.contentWidth,
    height: props.state.contentHeight
  },
  zoom: props.state.zoom,
  panX: props.state.panX,
  panY: props.state.panY
}));

const clipStyle = computed(() => {
  const box = contentBox.value;
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`
  };
});

/**
 * 裁剪框允许的活动范围。
 *
 * 用「实际内容范围」而不是「图片节点框」：放大、cover 适配或拖动图片后，
 * 内容会超出原节点框，这些区域仍然有像素，裁剪框必须能移动过去；
 * 同时内容之外没有像素，框一旦越界就会裁出空白，所以也以此为上限。
 *
 * @returns {{ left: number, top: number, right: number, bottom: number }} 允许范围。
 */
const cropBounds = computed(() => {
  const box = contentBox.value;
  return {
    left: box.left,
    top: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height
  };
});

const cropStyle = computed(() => ({
  left: `${props.state.crop.left}px`,
  top: `${props.state.crop.top}px`,
  width: `${props.state.crop.width}px`,
  height: `${props.state.crop.height}px`
}));

const maskStyles = computed(() => {
  const box = contentBox.value;
  const { crop } = props.state;
  const top = clamp(crop.top - box.top, 0, box.height);
  const bottom = clamp(crop.top - box.top + crop.height, 0, box.height);
  const left = clamp(crop.left - box.left, 0, box.width);
  const right = clamp(crop.left - box.left + crop.width, 0, box.width);

  return {
    top: { left: 0, top: 0, width: `${box.width}px`, height: `${top}px` },
    bottom: {
      left: 0,
      top: `${bottom}px`,
      width: `${box.width}px`,
      height: `${Math.max(0, box.height - bottom)}px`
    },
    left: { left: 0, top: `${top}px`, width: `${left}px`, height: `${Math.max(0, bottom - top)}px` },
    right: {
      left: `${right}px`,
      top: `${top}px`,
      width: `${Math.max(0, box.width - right)}px`,
      height: `${Math.max(0, bottom - top)}px`
    }
  };
});

/**
 * 计算控制条位置：贴在裁剪框下方，空间不足时翻到上方，并限制在画布宿主内。
 *
 * 与选区工具条同一套逻辑，只是基准从选区边界换成了裁剪框边界。
 *
 * @returns {Object} 控制条内联样式。
 */
const controlsStyle = computed(() => {
  const projection = props.state.projection;
  const root = overlayRoot.value;
  const size = controlsSize.value;
  if (!projection || !root || !size.width) {
    return { visibility: 'hidden' };
  }

  const host = root.getBoundingClientRect();
  const { crop } = props.state;
  const { basisX, basisY } = projection;
  const frameLeft = projection.left + basisX.x * crop.left + basisY.x * crop.top;
  const frameTop = projection.top + basisX.y * crop.left + basisY.y * crop.top;
  const frameWidth = basisX.x * crop.width + basisY.x * crop.height;
  const frameHeight = basisX.y * crop.width + basisY.y * crop.height;
  const below = frameTop + frameHeight + CONTROLS_GAP;
  const above = frameTop - size.height - CONTROLS_GAP;
  const maxBottom = host.height - Math.max(CONTROLS_PADDING, WORKSPACE_TOOLBAR_RESERVE);
  const maxTop = maxBottom - size.height;
  const fitsBelow = below <= maxTop;
  const fitsAbove = above >= CONTROLS_PADDING;
  const top = fitsBelow || !fitsAbove
    ? Math.max(CONTROLS_PADDING, Math.min(below, maxTop))
    : above;
  const halfWidth = size.width / 2;
  const maxLeft = Math.max(halfWidth + CONTROLS_PADDING, host.width - halfWidth - CONTROLS_PADDING);
  const left = Math.min(Math.max(frameLeft + frameWidth / 2, halfWidth + CONTROLS_PADDING), maxLeft);

  return { left: `${left}px`, top: `${top}px` };
});

/** @returns {string} 缩放滑杆的已填充比例，供轨道渐变使用。 */
const zoomProgress = computed(() => {
  const zoom = Number(props.state.zoom) || MIN_ZOOM;
  const ratio = (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
  return `${Math.min(100, Math.max(0, ratio * 100))}%`;
});

/**
 * 滑杆是否正在拖动。
 *
 * `input:active` 在拖动 range 圆钮时不会命中，圆钮的放大/玻璃态必须靠类名驱动。
 *
 * @returns {void}
 */
function startZoomDrag() {
  zoomDragging.value = true;
  window.addEventListener('pointerup', stopZoomDrag, { once: true });
  window.addEventListener('pointercancel', stopZoomDrag, { once: true });
}

/** @returns {void} 结束滑杆拖动。 */
function stopZoomDrag() {
  zoomDragging.value = false;
}

/** @returns {void} 记录控制条实际尺寸，供定位计算使用。 */
function measureControls() {
  const element = controlsRef.value;
  if (!element) return;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (width > 0 && height > 0 && (width !== controlsSize.value.width || height !== controlsSize.value.height)) {
    controlsSize.value = { width, height };
  }
}

onMounted(() => {
  overlayRoot.value?.focus({ preventScroll: true });
  const updateProjection = () => {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => props.editor.refreshImageCropProjection());
  };
  hostObserver = new ResizeObserver(updateProjection);
  hostObserver.observe(props.host);
  controlsObserver = new ResizeObserver(measureControls);
  if (controlsRef.value) controlsObserver.observe(controlsRef.value);
  measureControls();
  const eventBus = props.editor.getEditor()?.eventBus;
  unsubscribeEvents = [
    'viewport:zoom-changed',
    'viewport:transform-end',
    'viewport:pan-changed',
    'canvas:resized',
    'artboard:resized'
  ].map((eventName) => eventBus?.on(eventName, updateProjection)).filter(Boolean);
  window.addEventListener('keydown', handleGlobalKeydown, true);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  hostObserver?.disconnect();
  controlsObserver?.disconnect();
  unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
  window.removeEventListener('keydown', handleGlobalKeydown, true);
  pointerMode = null;
});

/** @param {PointerEvent} event 指针事件。 @returns {void} 开始拖动图片内容。 */
function startImageDrag(event) {
  if (event.target !== event.currentTarget) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  pointerMode = {
    type: 'image',
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    basisX: props.state.projection.basisX,
    basisY: props.state.projection.basisY,
    startPanX: props.state.panX,
    startPanY: props.state.panY,
    zoom: props.state.zoom
  };
}

/** @param {PointerEvent} event 指针事件。 @param {string} direction 控制点方向。
 * @returns {void} 开始调整裁剪框。 */
function startResize(event, direction) {
  event.currentTarget.setPointerCapture(event.pointerId);
  pointerMode = {
    type: 'resize',
    direction,
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    basisX: props.state.projection.basisX,
    basisY: props.state.projection.basisY,
    initial: { ...props.state.crop },
    bounds: { ...cropBounds.value }
  };
}

/**
 * 开始拖动裁剪框本身。
 *
 * 裁剪框还有可移动空间时移动框；裁剪框已经占满可用内容时没有可移动空间，
 * 退化为拖动图片，避免进入裁剪后无法调整取景。
 *
 * @param {PointerEvent} event 指针事件。
 * @returns {void}
 */
function startCropMove(event) {
  if (event.target !== event.currentTarget) return;
  const bounds = cropBounds.value;
  const { crop } = props.state;
  const availableWidth = bounds.right - bounds.left;
  const availableHeight = bounds.bottom - bounds.top;
  const hasRoom = crop.width < availableWidth - 0.5 || crop.height < availableHeight - 0.5;

  if (!hasRoom) {
    startImageDrag(event);
    return;
  }

  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  pointerMode = {
    type: 'crop',
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    basisX: props.state.projection.basisX,
    basisY: props.state.projection.basisY,
    initial: { ...crop },
    bounds: { ...bounds }
  };
}

/** @param {PointerEvent} event 指针移动事件。 @returns {void} 更新图片位置或裁剪范围。 */
function movePointer(event) {
  if (!pointerMode || pointerMode.pointerId !== event.pointerId) return;
  const delta = clientDeltaToLocal(
    event.clientX - pointerMode.clientX,
    event.clientY - pointerMode.clientY,
    pointerMode.basisX,
    pointerMode.basisY
  );
  if (pointerMode.type === 'image') {
    const pan = getImageCropPan({
      basisX: pointerMode.basisX,
      basisY: pointerMode.basisY,
      deltaX: event.clientX - pointerMode.clientX,
      deltaY: event.clientY - pointerMode.clientY,
      startPanX: pointerMode.startPanX,
      startPanY: pointerMode.startPanY,
      zoom: pointerMode.zoom
    });
    props.state.panX = pan.panX;
    props.state.panY = pan.panY;
  } else if (pointerMode.type === 'crop') {
    props.state.crop = moveCrop(pointerMode.initial, delta, pointerMode.bounds);
  } else {
    props.state.crop = resizeCrop(pointerMode.initial, pointerMode.direction, delta, pointerMode.bounds);
  }
}

/** @param {PointerEvent} event 指针抬起事件。 @returns {void} 结束当前拖动。 */
function finishPointer(event) {
  if (pointerMode?.pointerId === event.pointerId) pointerMode = null;
}

/** @returns {void} 把裁剪框和图片内容重置为完整图片。 */
function resetCrop() {
  props.state.zoom = 1;
  props.state.panX = 0;
  props.state.panY = 0;
  props.state.crop = createInitialCropRect(props.state);
}

/** @param {KeyboardEvent} event 键盘事件。 @returns {void} 处理裁剪键盘操作。 */
function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    props.editor.cancelSelectedImageCrop();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    props.editor.commitSelectedImageCrop();
  }
}

/** @param {KeyboardEvent} event 键盘事件。 @returns {void} 裁剪期间接管取消快捷键。 */
function handleGlobalKeydown(event) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  props.editor.cancelSelectedImageCrop();
}

/** @param {number} dx 屏幕横向变化。 @param {number} dy 屏幕纵向变化。
 * @param {Object} basisX 图片局部横轴。 @param {Object} basisY 图片局部纵轴。
 * @returns {{ x: number, y: number }} 图片局部坐标变化。 */
function clientDeltaToLocal(dx, dy, basisX, basisY) {
  const determinant = basisX.x * basisY.y - basisY.x * basisX.y;
  if (Math.abs(determinant) < 0.000001) return { x: 0, y: 0 };
  return {
    x: (basisY.y * dx - basisY.x * dy) / determinant,
    y: (-basisX.y * dx + basisX.x * dy) / determinant
  };
}

/**
 * 调整裁剪框尺寸。
 *
 * 边界取可用内容范围，超出则会被钳制，保证不会裁出没有像素的空白。
 *
 * @param {Object} initial 初始裁剪框。
 * @param {string} direction 控制点方向。
 * @param {{ x: number, y: number }} delta 指针偏移（图片框局部坐标）。
 * @param {{ left: number, top: number, right: number, bottom: number }} bounds 允许范围。
 * @returns {Object} 新裁剪范围。
 */
function resizeCrop(initial, direction, delta, bounds) {
  let left = initial.left;
  let top = initial.top;
  let right = initial.left + initial.width;
  let bottom = initial.top + initial.height;
  const movesLeft = direction.includes('w');
  const movesRight = direction.includes('e');
  const movesTop = direction.includes('n');
  const movesBottom = direction.includes('s');

  if (movesLeft) left = clamp(initial.left + delta.x, bounds.left, right - MIN_CROP_SIZE);
  if (movesRight) right = clamp(initial.left + initial.width + delta.x, left + MIN_CROP_SIZE, bounds.right);
  if (movesTop) top = clamp(initial.top + delta.y, bounds.top, bottom - MIN_CROP_SIZE);
  if (movesBottom) bottom = clamp(initial.top + initial.height + delta.y, top + MIN_CROP_SIZE, bounds.bottom);
  return { left, top, width: right - left, height: bottom - top };
}

/** @param {number} value 当前值。 @param {number} minimum 最小值。
 * @param {number} maximum 最大值。 @returns {number} 限制后的数值。 */
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

/**
 * 平移裁剪框，保持尺寸不变并限制在可用内容范围内。
 *
 * @param {Object} initial 拖动开始时的裁剪框。
 * @param {{ x: number, y: number }} delta 指针在图片框局部坐标中的偏移。
 * @param {{ left: number, top: number, right: number, bottom: number }} bounds 允许范围。
 * @returns {Object} 新裁剪范围。
 */
function moveCrop(initial, delta, bounds) {
  const maxLeft = Math.max(bounds.left, bounds.right - initial.width);
  const maxTop = Math.max(bounds.top, bounds.bottom - initial.height);
  return {
    left: clamp(initial.left + delta.x, bounds.left, maxLeft),
    top: clamp(initial.top + delta.y, bounds.top, maxTop),
    width: initial.width,
    height: initial.height
  };
}
</script>
