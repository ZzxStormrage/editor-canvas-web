<template>
  <span ref="previewRoot" class="layer-preview" :class="{ 'layer-preview--loading': isLoading }" aria-hidden="true">
    <img
      v-if="canShowImage"
      class="layer-preview__image"
      :src="previewSource"
      alt=""
      loading="lazy"
      decoding="async"
      @error="handleImageError"
    />
    <span v-else class="layer-preview__placeholder">{{ fallbackText }}</span>
  </span>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getLayerTypeLabel } from './layerDisplay.js'
import { observeLayerPreviewOnce } from './layerPreviewVisibility.js'

const props = defineProps({
  layer: {
    type: Object,
    required: true
  },
  loadThumbnail: {
    type: Function,
    required: true
  }
})

const previewRoot = ref(null)
const previewSource = ref(props.layer.thumbnailSource || null)
const imageLoadFailed = ref(false)
const isLoading = ref(false)
const canShowImage = computed(() => Boolean(previewSource.value) && !imageLoadFailed.value)
const fallbackText = computed(() => {
  if (props.layer.type === 'text') {
    return props.layer.previewText || props.layer.name || '文字'
  }
  return props.layer.name || getLayerTypeLabel(props.layer.type)
})
let isVisible = false
let requestId = 0
let stopObserving = () => {}

/**
 * 调用编辑器 API 获取当前版本缩略图，旧请求不会覆盖新结果。
 *
 * @returns {Promise<void>}
 */
async function refreshThumbnail() {
  const currentRequestId = ++requestId
  isLoading.value = true

  try {
    const source = await props.loadThumbnail(props.layer.id, { maxSize: 160 })
    if (currentRequestId === requestId && source) {
      previewSource.value = source
      imageLoadFailed.value = false
    }
  } catch (error) {
    console.warn('[LayerPreview] Failed to load thumbnail.', error)
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

/**
 * 图片加载失败时回退为文字占位，避免列表出现破损图片。
 *
 * @returns {void}
 */
function handleImageError() {
  imageLoadFailed.value = true
}

watch(
  () => [props.layer.thumbnailVersion, props.layer.thumbnailSource],
  ([, thumbnailSource]) => {
    imageLoadFailed.value = false
    if (thumbnailSource) {
      previewSource.value = thumbnailSource
      return
    }
    if (isVisible) {
      void refreshThumbnail()
    }
  }
)

onMounted(() => {
  stopObserving = observeLayerPreviewOnce(previewRoot.value, () => {
    isVisible = true
    void refreshThumbnail()
  })
})

onBeforeUnmount(() => {
  requestId += 1
  stopObserving()
})
</script>
