<template>
  <div class="canvas-scrollbars">
    <div
      v-if="bars.horizontal.visible"
      class="canvas-scrollbar canvas-scrollbar--horizontal"
      role="scrollbar"
      aria-label="画布水平滚动条"
      aria-controls="canvas-viewport"
      aria-orientation="horizontal"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(bars.horizontal.maxContentOffset)"
      :aria-valuenow="Math.round(bars.horizontal.contentOffset)"
      tabindex="0"
      :style="{
        '--scrollbar-thumb-size': `${bars.horizontal.thumbSize}px`,
        '--scrollbar-thumb-position': `${bars.horizontal.thumbPosition}px`
      }"
      @pointerdown="startDrag('horizontal', $event)"
      @pointermove="moveDrag($event)"
      @pointerup="endDrag($event)"
      @pointercancel="endDrag($event)"
      @keydown="handleKeydown('horizontal', $event)"
    >
      <span class="canvas-scrollbar__thumb"></span>
    </div>
    <div
      v-if="bars.vertical.visible"
      class="canvas-scrollbar canvas-scrollbar--vertical"
      role="scrollbar"
      aria-label="画布垂直滚动条"
      aria-controls="canvas-viewport"
      aria-orientation="vertical"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(bars.vertical.maxContentOffset)"
      :aria-valuenow="Math.round(bars.vertical.contentOffset)"
      tabindex="0"
      :style="{
        '--scrollbar-thumb-size': `${bars.vertical.thumbSize}px`,
        '--scrollbar-thumb-position': `${bars.vertical.thumbPosition}px`
      }"
      @pointerdown="startDrag('vertical', $event)"
      @pointermove="moveDrag($event)"
      @pointerup="endDrag($event)"
      @pointercancel="endDrag($event)"
      @keydown="handleKeydown('vertical', $event)"
    >
      <span class="canvas-scrollbar__thumb"></span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { getScrollbarMetrics } from '../../viewport/scrollbar.js';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  host: {
    type: Object,
    default: null
  }
});

const hostSize = ref({ width: 0, height: 0 });
const revision = ref(0);
const drag = ref(null);
let resizeObserver = null;
let unsubscribeEvents = [];

const bars = computed(() => {
  revision.value;
  const { width, height } = hostSize.value;
  const state = props.editor?.state;
  const stage = props.editor?.stage;
  const workspace = state?.workspace;
  const zoom = Number(state?.zoom) || 1;

  if (!width || !height || !workspace || !stage) {
    return { horizontal: hiddenScrollbar(), vertical: hiddenScrollbar() };
  }

  return {
    horizontal: getScrollbarMetrics({
      viewportSize: width,
      contentSize: Number(workspace.width) * zoom,
      contentStart: stage.x + Number(workspace.x || 0) * zoom,
      trackSize: Math.max(0, width - 34)
    }),
    vertical: getScrollbarMetrics({
      viewportSize: height,
      contentSize: Number(workspace.height) * zoom,
      contentStart: stage.y + Number(workspace.y || 0) * zoom,
      trackSize: Math.max(0, height - 34)
    })
  };
});

watch(
  [() => props.host, () => props.editor?.ready?.value],
  ([host, ready]) => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
    unsubscribeEvents = [];

    if (!host) return;

    const refresh = () => {
      hostSize.value = { width: host.clientWidth, height: host.clientHeight };
      revision.value += 1;
    };

    resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(host);
    refresh();

    if (ready) {
      const eventBus = props.editor.getEditor?.()?.eventBus;
      if (!eventBus) return;
      unsubscribeEvents = [
        'viewport:pan-changed',
        'viewport:zoom-changed',
        'canvas:resized',
        'artboard:resized',
        'workspace:bounds-changed'
      ].map((eventName) => eventBus.on(eventName, refresh));
    }
  },
  { immediate: true, flush: 'post' }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  unsubscribeEvents.forEach((unsubscribe) => unsubscribe());
});

/**
 * 开始拖动滚动条或点击轨道跳转。
 * @param {'horizontal' | 'vertical'} axis 滚动方向。
 * @param {PointerEvent} event 指针事件。
 * @returns {void}
 */
function startDrag(axis, event) {
  if (event.button !== 0) return;
  event.preventDefault();

  const metrics = bars.value[axis];
  const rect = event.currentTarget.getBoundingClientRect();
  const pointer = axis === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top;
  const isThumb = event.target.closest('.canvas-scrollbar__thumb');
  const thumbPosition = isThumb
    ? metrics.thumbPosition
    : clamp(pointer - metrics.thumbSize / 2, 0, metrics.maxThumbPosition);

  drag.value = {
    axis,
    pointerId: event.pointerId,
    pointerStart: pointer,
    thumbStart: thumbPosition,
    metrics
  };
  event.currentTarget.setPointerCapture(event.pointerId);

  if (!isThumb) applyThumbPosition(drag.value, thumbPosition);
}

/** @param {PointerEvent} event 指针移动事件。 @returns {void} */
function moveDrag(event) {
  if (!drag.value || event.pointerId !== drag.value.pointerId) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const pointer = drag.value.axis === 'horizontal'
    ? event.clientX - rect.left
    : event.clientY - rect.top;
  const position = clamp(
    drag.value.thumbStart + pointer - drag.value.pointerStart,
    0,
    drag.value.metrics.maxThumbPosition
  );

  applyThumbPosition(drag.value, position);
}

/** @param {PointerEvent} event 指针结束事件。 @returns {void} */
function endDrag(event) {
  if (!drag.value || event.pointerId !== drag.value.pointerId) return;
  drag.value = null;
}

/**
 * 把滑块位置换算为画板平移量。
 * @param {Object} activeDrag 当前滚动条拖动状态。
 * @param {number} thumbPosition 滑块轨道位置。
 * @returns {void}
 */
function applyThumbPosition(activeDrag, thumbPosition) {
  const state = props.editor.state;
  const stage = props.editor.stage;
  const workspace = state.workspace;
  const zoom = state.zoom;
  const contentOffset = activeDrag.metrics.maxThumbPosition > 0
    ? thumbPosition / activeDrag.metrics.maxThumbPosition
      * activeDrag.metrics.maxContentOffset
    : 0;
  const origin = activeDrag.axis === 'horizontal' ? workspace.x || 0 : workspace.y || 0;
  const currentStage = activeDrag.axis === 'horizontal' ? stage.x : stage.y;
  const targetStage = -origin * zoom - contentOffset;
  const delta = targetStage - currentStage;

  if (activeDrag.axis === 'horizontal') {
    props.editor.panArtboard(delta, 0);
  } else {
    props.editor.panArtboard(0, delta);
  }
}

/** @param {'horizontal' | 'vertical'} axis 滚动方向。 @param {KeyboardEvent} event 键盘事件。 @returns {void} */
function handleKeydown(axis, event) {
  const direction = axis === 'horizontal'
    ? event.key === 'ArrowRight' ? -1 : event.key === 'ArrowLeft' ? 1 : 0
    : event.key === 'ArrowDown' ? -1 : event.key === 'ArrowUp' ? 1 : 0;

  if (!direction) return;
  event.preventDefault();
  const step = direction * (event.shiftKey ? 120 : 40);
  if (axis === 'horizontal') props.editor.panArtboard(step, 0);
  else props.editor.panArtboard(0, step);
}

/** @returns {Object} 隐藏滚动条的默认数据。 */
function hiddenScrollbar() {
  return {
    visible: false,
    thumbSize: 0,
    thumbPosition: 0,
    maxThumbPosition: 0,
    maxContentOffset: 0,
    contentOffset: 0
  };
}

/** @param {number} value 待限制数值。 @param {number} min 最小值。 @param {number} max 最大值。 @returns {number} 限制后的数值。 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
</script>
