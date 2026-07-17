<template>
  <main class="customization-page">
    <h1 class="visually-hidden">{{ pageTitle }}</h1>

    <section class="preview-section" :aria-label="`${pageTitle}效果预览`">
      <div v-if="documentData && !templateLoading" class="canvas-frame" :style="canvasFrameStyle">
        <CanvasDocumentViewport
          ref="canvasViewportRef"
          :document="documentData"
          @loaded="handleDocumentLoaded"
          @error="handleCanvasError"
        />
        <div v-if="!canvasLoaded" class="state-layer" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <span>画布加载中...</span>
        </div>
      </div>

      <div v-else-if="templateLoading" class="preview-state" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>模板加载中...</span>
      </div>

      <div v-else class="preview-state is-error" role="alert">
        {{ templateError || '请提供有效的模板 ID。' }}
      </div>
    </section>

    <section class="form-section">
      <div class="field-group">
        <div class="field-heading">
          <span class="field-marker" aria-hidden="true"></span>
          <h2>上传图片</h2>
        </div>

        <div class="upload-control">
          <div class="upload-preview">
            <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="当前替换图片" />
            <span v-else>{{ hasImageTarget ? '待上传' : '未配置' }}</span>
          </div>

          <div class="upload-actions">
            <input
              ref="albumInputRef"
              class="file-input"
              type="file"
              accept="image/*"
              aria-label="从手机相册选择图片"
              :disabled="!canPickImage"
              @change="handleImageChange"
            />
            <button
              type="button"
              class="secondary-button"
              :disabled="!canPickImage"
              @click="openImagePicker"
            >
              {{ imageReplacing ? '上传中...' : '上传图片' }}
            </button>
          </div>
        </div>
      </div>

      <div class="field-group">
        <div class="field-heading">
          <span class="field-marker" aria-hidden="true"></span>
          <h2>输入文字</h2>
        </div>

        <input
          v-model="textValue"
          class="text-input"
          type="text"
          maxlength="100"
          placeholder="自定义输入"
          :disabled="!canvasLoaded || !hasTextTarget"
        />
      </div>

      <p v-if="operationStatus.text" class="operation-status" :class="`is-${operationStatus.type}`" role="status">
        {{ operationStatus.text }}
      </p>
    </section>

    <footer class="submit-footer">
      <p v-if="saveStatus.text" class="save-status" :class="`is-${saveStatus.type}`" role="status" aria-live="polite">
        {{ saveStatus.text }}
      </p>
      <button
        class="submit-button"
        type="button"
        :disabled="!canSubmit"
        :aria-busy="saving"
        @click="onSubmit"
      >
        {{ saving ? '保存中...' : '立即购买' }}
      </button>
    </footer>

    <div v-if="saving" class="save-overlay" role="status" aria-live="assertive">
      <span class="spinner" aria-hidden="true"></span>
      <span>正在保存...</span>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CanvasDocumentViewport from './CanvasDocumentViewport.vue'
import { customerPictureApi } from '../api/customer-picture.js'
import { useH5PageSave } from '../composables/useH5PageSave.js'
import { useH5TemplateDocument } from '../composables/useH5TemplateDocument.js'

const props = defineProps({
  pageTitle: {
    type: String,
    required: true
  },
  pageId: {
    type: String,
    required: true
  },
  imageDescription: {
    type: String,
    default: '原图替换'
  },
  textDescription: {
    type: String,
    default: '文本替换'
  }
})

const route = useRoute()
const router = useRouter()
const canvasViewportRef = ref(null)
const albumInputRef = ref(null)
const canvasLoaded = ref(false)
const imageReplacing = ref(false)
const imagePreviewUrl = ref('')
const textValue = ref('')
const hasImageTarget = ref(false)
const hasTextTarget = ref(false)
const operationStatus = ref({ type: 'success', text: '' })
const {
  documentData,
  templateLoading,
  templateError,
  handleCanvasError: handleTemplateCanvasError,
  loadTemplateFromRoute
} = useH5TemplateDocument({ errorLabel: props.pageId })
const {
  saving,
  saveStatus,
  resetSaveStatus,
  savePage
} = useH5PageSave({
  route,
  router,
  pageId: props.pageId,
  defaultDesignName: props.pageTitle,
  getEditor: () => canvasViewportRef.value?.getEditor?.(),
  onBeforeNavigateBack: () => {
    saveStatus.value = { type: 'success', text: '保存成功，正在返回' }
  }
})

const canvasFrameStyle = computed(() => {
  const width = Number(documentData.value?.canvas?.width)
  const height = Number(documentData.value?.canvas?.height)

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return { '--canvas-ratio': 1, aspectRatio: '1 / 1' }
  }

  return {
    '--canvas-ratio': width / height,
    aspectRatio: `${width} / ${height}`
  }
})

const canPickImage = computed(() => {
  return canvasLoaded.value && !imageReplacing.value && !saving.value
})

const canSubmit = computed(() => {
  return canvasLoaded.value && !templateLoading.value && !imageReplacing.value && !saving.value
})

/** @returns {Promise<void>} 根据路由模板 ID 加载 customer 模板。 */
async function reloadTemplate() {
  resetPageState()
  await loadTemplateFromRoute(route.query)
}

/** @returns {void} 清理上一个模板的页面状态。 */
function resetPageState() {
  canvasLoaded.value = false
  imagePreviewUrl.value = ''
  textValue.value = ''
  hasImageTarget.value = false
  hasTextTarget.value = false
  operationStatus.value = { type: 'success', text: '' }
  resetSaveStatus()
}

/**
 * @param {{ editor: Object }} payload 文档加载事件。
 * @returns {void}
 */
function handleDocumentLoaded(payload) {
  const editor = payload.editor
  const imageTargets = getImageTargets(editor)
  const textTargets = getTextTargets(editor)

  editor.arrangeLayersByRole({ back: ['background'], front: ['mask'] })
  hasImageTarget.value = imageTargets.length > 0
  hasTextTarget.value = textTargets.length > 0
  imagePreviewUrl.value = String(imageTargets[0]?.url ?? '')
  textValue.value = String(textTargets[0]?.text ?? '')
  canvasLoaded.value = true
  templateError.value = ''

  if (!hasImageTarget.value || !hasTextTarget.value) {
    operationStatus.value = {
      type: 'warning',
      text: createMissingMarkerMessage()
    }
  }
}

/**
 * @param {*} error 画布加载错误。
 * @returns {void}
 */
function handleCanvasError(error) {
  canvasLoaded.value = false
  handleTemplateCanvasError(error)
}

/**
 * 在用户点击事件中直接打开系统图片选择器。
 *
 * @returns {void}
 */
function openImagePicker() {
  if (!canPickImage.value) {
    return
  }

  albumInputRef.value?.click()
}

/**
 * @param {Event} event 文件选择事件。
 * @returns {Promise<void>} 图片上传和替换完成。
 */
async function handleImageChange(event) {
  const file = event.target.files?.[0]
  const editor = canvasViewportRef.value?.getEditor?.()

  if (!file || !editor || !canPickImage.value) {
    return
  }
  if (!hasImageTarget.value) {
    operationStatus.value = {
      type: 'warning',
      text: `模板未配置“${props.imageDescription}”标记。`
    }
    event.target.value = ''
    return
  }

  imageReplacing.value = true
  operationStatus.value = { type: 'success', text: '' }
  try {
    const imageUrl = await customerPictureApi.upload(file)
    const targets = getImageTargets(editor)

    await Promise.all(
      targets.map((target) => editor.replaceImage(target, imageUrl, {
        fit: 'contain',
        allowLocked: true
      }))
    )
    imagePreviewUrl.value = imageUrl
    operationStatus.value = { type: 'success', text: '图片已更新' }
  } catch (error) {
    console.error(`${props.pageId} image replacement failed.`, error)
    operationStatus.value = { type: 'error', text: error.message || '图片上传失败，请重试。' }
  } finally {
    imageReplacing.value = false
    if (event.target instanceof HTMLInputElement) {
      event.target.value = ''
    }
  }
}

/** @returns {void} 将输入内容同步到所有文本替换节点。 */
function applyTextValue() {
  const editor = canvasViewportRef.value?.getEditor?.()
  if (!editor || !canvasLoaded.value) {
    return
  }

  getTextTargets(editor).forEach((target) => {
    editor.replaceText(target, textValue.value)
  })
}

/** @returns {Promise<void>} 生成保存数据并通知小程序。 */
async function onSubmit() {
  const editor = canvasViewportRef.value?.getEditor?.()
  if (!editor || !canSubmit.value) {
    return
  }

  operationStatus.value = { type: 'success', text: '' }
  await savePage()
}

/** @param {Object} editor 核心编辑器实例。 @returns {Object[]} 图片替换节点。 */
function getImageTargets(editor) {
  return editor.getElementsByAttribute('image.description', props.imageDescription)
}

/** @param {Object} editor 核心编辑器实例。 @returns {Object[]} 文本替换节点。 */
function getTextTargets(editor) {
  return editor.getElementsByAttribute('text.description', props.textDescription)
}

/** @returns {string} 缺少模板标记时的提示。 */
function createMissingMarkerMessage() {
  if (!hasImageTarget.value && !hasTextTarget.value) {
    return `模板未配置“${props.imageDescription}”和“${props.textDescription}”标记。`
  }

  return hasImageTarget.value
    ? `模板未配置“${props.textDescription}”标记。`
    : `模板未配置“${props.imageDescription}”标记。`
}

watch(textValue, applyTextValue)
watch(
  () => [route.query.templateId, route.query.partnerId],
  () => {
    void reloadTemplate()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.customization-page {
  position: relative;
  display: flex;
  width: min(100%, 430px);
  min-height: 100vh;
  margin: 0 auto;
  flex-direction: column;
  color: #191919;
  background: #ffffff;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
}

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

.preview-section {
  --preview-max-height: clamp(210px, 42vh, 390px);

  display: flex;
  min-height: 250px;
  padding: 16px 20px;
  align-items: center;
  justify-content: center;
  background: #f4f5f6;
}

.canvas-frame {
  position: relative;
  width: min(100%, calc(var(--preview-max-height) * var(--canvas-ratio)));
  max-height: var(--preview-max-height);
  overflow: hidden;
  background: #e3e3e3;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
}

.canvas-frame :deep(.canvas-document-viewport) {
  position: absolute;
  inset: 0;
}

.state-layer,
.preview-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #5f6368;
  font-size: 13px;
}

.state-layer {
  position: absolute;
  inset: 0;
  background: rgba(244, 245, 246, 0.92);
}

.preview-state {
  min-height: 218px;
}

.preview-state.is-error {
  color: #a22b31;
  text-align: center;
}

.form-section {
  display: flex;
  padding: 22px 20px 28px;
  flex: 1;
  flex-direction: column;
  gap: 24px;
}

.field-group {
  display: grid;
  gap: 10px;
}

.field-heading {
  display: flex;
  align-items: center;
  gap: 7px;
}

.field-heading h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.field-marker {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #e6002d;
}

.upload-control {
  display: flex;
  padding: 0 10px;
  align-items: center;
  gap: 18px;
}

.upload-preview {
  display: flex;
  width: 88px;
  height: 88px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  background: #f2f2f2;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-preview span {
  color: #737373;
  font-size: 12px;
}

.upload-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.secondary-button {
  display: inline-flex;
  min-width: 76px;
  height: 30px;
  padding: 0 12px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e6002d;
  border-radius: 4px;
  color: #d80029;
  background: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 160ms ease-out, color 160ms ease-out;
}

.secondary-button:hover {
  background: #fff1f3;
}

.secondary-button:disabled {
  border-color: #c9c9c9;
  color: #8c8c8c;
  background: #f5f5f5;
  cursor: not-allowed;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.secondary-button {
  appearance: none;
}

.text-input {
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border: 1px solid #cfcfcf;
  border-radius: 5px;
  outline: none;
  color: #202020;
  background: #ffffff;
  font-size: 13px;
  transition: border-color 160ms ease-out, box-shadow 160ms ease-out;
}

.text-input::placeholder {
  color: #666666;
}

.text-input:focus {
  border-color: #e6002d;
  box-shadow: 0 0 0 2px rgba(230, 0, 45, 0.1);
}

.text-input:disabled {
  color: #7a7a7a;
  background: #f5f5f5;
  cursor: not-allowed;
}

.operation-status {
  margin: 0;
  color: #26734d;
  font-size: 12px;
  line-height: 1.5;
}

.operation-status.is-error,
.operation-status.is-warning {
  color: #a22b31;
}

.submit-footer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding: 10px 20px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #ededed;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
}

.save-status {
  margin: 0 0 8px;
  color: #26734d;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}

.save-status.is-error {
  color: #a22b31;
}

.submit-button {
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 5px;
  color: #ffffff;
  background: #e6002d;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.submit-button:disabled {
  color: #ffffff;
  background: #b7b7b7;
  cursor: not-allowed;
}

.submit-button:focus-visible,
.secondary-button:focus-within {
  outline: 2px solid #e6002d;
  outline-offset: 2px;
}

.save-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #ffffff;
  background: rgba(18, 18, 18, 0.64);
  font-size: 13px;
  backdrop-filter: blur(2px);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-height: 690px) {
  .preview-section {
    --preview-max-height: 220px;

    min-height: 230px;
    padding-block: 10px;
  }

  .form-section {
    padding-block: 18px;
    gap: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .secondary-button,
  .text-input {
    transition: none;
  }

  .spinner {
    animation-duration: 1.4s;
  }
}
</style>
