<template>
  <div class="crop-dialog-backdrop" @click.self="handleCancel">
    <section class="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title">
      <h2 id="crop-dialog-title" class="visually-hidden">裁剪图片</h2>

      <div class="crop-dialog-workspace">
        <div class="crop-dialog-tip">
          <p><span aria-hidden="true"></span>上传图片建议200-300dpi</p>
          <p><span aria-hidden="true"></span>logo、元素建议使用PNG格式，边缘半透明效果更佳</p>
        </div>

        <div class="crop-dialog-stage">
          <ImageCrop
            ref="cropperRef"
            :img="sourceUrl"
            :output-type="outputType"
            :output-size="0.92"
            :fixed="true"
            :fixed-number="aspectRatio"
            :auto-crop="true"
            :can-move-box="false"
            :center-box="true"
            :max-img-size="2400"
            mode="cover"
            @img-load="handleImageLoad"
          />
          <div v-if="!imageReady" class="crop-dialog-loading" role="status">
            <span class="crop-dialog-spinner" aria-hidden="true"></span>
            <span>图片加载中...</span>
          </div>
        </div>

        <p v-if="errorMessage" class="crop-dialog-error" role="alert">{{ errorMessage }}</p>
      </div>

      <footer class="crop-dialog-actions">
        <div class="crop-dialog-confirmation">
          <button type="button" aria-label="取消裁剪" :disabled="busy" @click="handleCancel">
            <svg class="crop-dialog-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <span v-if="busy">上传中...</span>
          <button
            type="button"
            aria-label="确认裁剪"
            :disabled="busy || !imageReady"
            :aria-busy="busy"
            @click="confirmCrop"
          >
            <svg class="crop-dialog-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />
            </svg>
          </button>
        </div>

        <div class="crop-dialog-tools">
          <button type="button" :disabled="busy || !imageReady" @click="rotateLeft">
            <svg class="crop-dialog-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8V3.8M5 8h4.2M5.4 7.6A8 8 0 1 1 4 15" />
            </svg>
            <span>左转90°</span>
          </button>
          <button type="button" :disabled="busy || !imageReady" @click="rotateRight">
            <svg class="crop-dialog-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 8V3.8M19 8h-4.2M18.6 7.6A8 8 0 1 0 20 15" />
            </svg>
            <span>右转90°</span>
          </button>
          <button type="button" class="is-active" :disabled="busy || !imageReady" @click="resetCrop">
            <svg class="crop-dialog-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3v14h14M3 7h14v14" />
            </svg>
            <span>裁剪</span>
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

import ImageCrop from './ImageCrop.vue'

const props = defineProps({
  sourceUrl: {
    type: String,
    required: true
  },
  aspectRatio: {
    type: Array,
    default: () => [1, 1]
  },
  outputType: {
    type: String,
    default: 'jpeg'
  },
  busy: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'confirm'])
const cropperRef = ref(null)
const imageReady = ref(false)
const errorMessage = ref('')

watch(
  () => props.sourceUrl,
  () => {
    imageReady.value = false
    errorMessage.value = ''
  }
)

/** @param {'success' | 'error'} status 图片加载状态。 @returns {void} */
function handleImageLoad(status) {
  imageReady.value = status === 'success'
  errorMessage.value = imageReady.value ? '' : '图片加载失败，请重新选择。'
}

/** @returns {void} 请求关闭裁剪弹框。 */
function handleCancel() {
  if (!props.busy) {
    emit('cancel')
  }
}

/** @returns {void} 将图片向左旋转 90 度。 */
function rotateLeft() {
  if (!props.busy && imageReady.value) {
    cropperRef.value?.rotateLeft?.()
  }
}

/** @returns {void} 将图片向右旋转 90 度。 */
function rotateRight() {
  if (!props.busy && imageReady.value) {
    cropperRef.value?.rotateRight?.()
  }
}

/** @returns {void} 重新生成居中的裁剪区域。 */
function resetCrop() {
  if (!props.busy && imageReady.value) {
    cropperRef.value?.goAutoCrop?.()
  }
}

/** @returns {void} 生成裁剪 Blob 并交给业务层上传。 */
function confirmCrop() {
  if (props.busy || !imageReady.value || typeof cropperRef.value?.getCropBlob !== 'function') {
    return
  }

  errorMessage.value = ''
  cropperRef.value.getCropBlob((blob) => {
    if (!blob) {
      errorMessage.value = '裁剪失败，请调整后重试。'
      return
    }
    emit('confirm', blob)
  }, props.outputType)
}
</script>

<style lang="scss" scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.crop-dialog-backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  padding: 0;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.62);
}

.crop-dialog {
  display: grid;
  width: min(100%, 430px);
  height: 100vh;
  max-height: 860px;
  overflow: hidden;
  grid-template-rows: minmax(0, 1fr) auto;
  color: #ffffff;
  background: #080808;
  box-shadow: 0 -16px 40px rgba(0, 0, 0, 0.28);
}

.crop-dialog-workspace {
  display: flex;
  min-height: 0;
  padding: 58px 40px 22px;
  flex-direction: column;
  gap: 24px;
  background: #080808;
}

.crop-dialog-tip {
  padding: 14px 20px;
  border: 1px dashed #777777;
  color: #f5f5f5;
  font-size: 12px;
  line-height: 1.65;
}

.crop-dialog-tip p {
  display: flex;
  margin: 0;
  align-items: flex-start;
  gap: 7px;
}

.crop-dialog-tip span {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  flex: 0 0 auto;
  background: #ffffff;
}

.crop-dialog-stage {
  position: relative;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  flex: 1;
  background: #bfc0c2;
}

.crop-dialog-stage :deep(.image-editor),
.crop-dialog-stage :deep(.editor-box-canvas) {
  background-color: #bfc0c2;
}

.crop-dialog-stage :deep(.editor-box-canvas) {
  background-image: none;
}

.crop-dialog-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #ffffff;
  background: #2a2a2a;
  font-size: 12px;
}

.crop-dialog-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: crop-dialog-spin 700ms linear infinite;
}

.crop-dialog-error {
  margin: -12px 0 0;
  color: #ff9aa5;
  font-size: 12px;
  line-height: 1.45;
}

.crop-dialog-actions {
  padding: 8px 14px calc(10px + env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  color: #111111;
  background: #ffffff;
}

.crop-dialog-confirmation {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
}

.crop-dialog-confirmation > span {
  color: #666666;
  font-size: 12px;
  text-align: center;
}

.crop-dialog-confirmation button,
.crop-dialog-tools button {
  display: inline-flex;
  padding: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #111111;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.crop-dialog-confirmation button {
  width: 44px;
  height: 38px;
}

.crop-dialog-icon {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.crop-dialog-confirmation button:last-child {
  justify-self: end;
}

.crop-dialog-tools {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.crop-dialog-tools button {
  min-height: 58px;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
}

.crop-dialog-tools button.is-active {
  color: #e6002d;
}

.crop-dialog-confirmation button:disabled,
.crop-dialog-tools button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.crop-dialog-confirmation button:focus-visible,
.crop-dialog-tools button:focus-visible {
  border-radius: 4px;
  outline: 2px solid #e6002d;
  outline-offset: 1px;
}

.crop-dialog-enter-active,
.crop-dialog-leave-active {
  transition: opacity 180ms ease;
}

.crop-dialog-enter-active .crop-dialog,
.crop-dialog-leave-active .crop-dialog {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.crop-dialog-enter-from,
.crop-dialog-leave-to {
  opacity: 0;
}

.crop-dialog-enter-from .crop-dialog,
.crop-dialog-leave-to .crop-dialog {
  transform: translateY(100%);
}

@keyframes crop-dialog-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-height: 640px) {
  .crop-dialog-workspace {
    padding: 22px 32px 14px;
    gap: 14px;
  }

  .crop-dialog-tip {
    padding-block: 9px;
  }

  .crop-dialog-tools button {
    min-height: 50px;
  }
}

@media (max-width: 430px), (max-height: 860px) {
  .crop-dialog {
    max-height: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crop-dialog-enter-active,
  .crop-dialog-leave-active,
  .crop-dialog-enter-active .crop-dialog,
  .crop-dialog-leave-active .crop-dialog {
    transition: none;
  }
}
</style>
