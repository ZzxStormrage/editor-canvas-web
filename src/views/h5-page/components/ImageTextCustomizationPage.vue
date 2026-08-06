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
              :accept="IMAGE_FILE_ACCEPT"
              aria-label="从手机相册选择图片"
              :disabled="!canPickImage"
              @change="handleImageChange"
            />
            <input
              v-if="imagePickerSheet"
              ref="cameraInputRef"
              class="file-input"
              type="file"
              :accept="IMAGE_FILE_ACCEPT"
              capture="environment"
              aria-label="使用手机摄像头拍照"
              :disabled="!canPickImage"
              @change="handleImageChange"
            />
            <button type="button" class="secondary-button" :disabled="!canPickImage" @click="handleUploadButtonClick">
              {{ imageReplacing ? '上传中...' : '上传图片' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="separateTextInputs && textFields.length" class="field-group">
        <div class="field-heading">
          <span class="field-marker" aria-hidden="true"></span>
          <h2>输入文字</h2>
        </div>

        <div class="text-input-list">
          <label v-for="field in textFields" :key="field.key" class="text-input-field" :for="field.inputId">
            <span v-if="field.label">{{ field.label }}</span>
            <textarea
              v-if="isTextInputMultiline(field)"
              :id="field.inputId"
              class="text-input"
              :value="field.value"
              rows="3"
              :aria-label="field.label || '输入文字'"
              :placeholder="field.label ? `请输入${field.label}` : '自定义输入'"
              :disabled="!canvasLoaded"
              @compositionstart="handleTextCompositionStart"
              @compositionend="handleTextCompositionEnd(field, $event)"
              @input="handleTextInput(field, $event)"
            ></textarea>
            <input
              v-else
              :id="field.inputId"
              class="text-input"
              type="text"
              :value="field.value"
              :aria-label="field.label || '输入文字'"
              :placeholder="field.label ? `请输入${field.label}` : '自定义输入'"
              :disabled="!canvasLoaded"
              @compositionstart="handleTextCompositionStart"
              @compositionend="handleTextCompositionEnd(field, $event)"
              @input="handleTextInput(field, $event)"
            />
          </label>
        </div>
      </div>
    </section>

    <footer class="submit-footer">
      <p v-if="saveStatus.type === 'error' && saveStatus.text" class="save-error" role="alert">
        {{ saveStatus.text }}
      </p>
      <button
        class="submit-button"
        type="button"
        :disabled="!canSubmit"
        :aria-busy="saving || redirecting"
        @click="onSubmit"
      >
        {{ saving ? '保存中...' : '立即购买' }}
      </button>
    </footer>

    <div v-if="saving || redirecting" class="save-overlay" role="status" aria-live="assertive">
      <span class="spinner" aria-hidden="true"></span>
      <span>{{ saveProgressText }}</span>
    </div>

    <Transition name="picker-sheet">
      <div
        v-if="imagePickerSheet && showImagePickerSheet"
        class="image-picker-backdrop"
        @click.self="closeImagePickerSheet"
      >
        <section class="image-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="image-picker-title">
          <button class="sheet-close" type="button" aria-label="关闭上传图片面板" @click="closeImagePickerSheet">
            <v-icon icon="mdi-close" size="18" />
          </button>
          <h2 id="image-picker-title">上传图片开始定制</h2>

          <div class="image-picker-options">
            <button type="button" class="image-picker-option" @click="openImagePicker('camera')">
              <span class="image-picker-icon" aria-hidden="true">
                <v-icon icon="mdi-camera-outline" size="30" />
              </span>
              <span>相机拍摄</span>
            </button>
            <button type="button" class="image-picker-option" @click="openImagePicker('album')">
              <span class="image-picker-icon" aria-hidden="true">
                <v-icon icon="mdi-image-outline" size="30" />
              </span>
              <span>相册选取</span>
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="crop-dialog">
      <ImageCropDialog
        v-if="imageCrop && showImageCropDialog"
        :key="cropSourceUrl"
        :source-url="cropSourceUrl"
        :aspect-ratio="cropAspectRatio"
        :output-type="cropOutputType"
        :busy="imageReplacing"
        @cancel="closeImageCropDialog"
        @confirm="handleCropConfirm"
      />
    </Transition>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { IMAGE_FILE_ACCEPT } from '../../../config/image-upload.js'
import CanvasDocumentViewport from './CanvasDocumentViewport.vue'
import ImageCropDialog from './ImageCropDialog.vue'
import { customerPictureApi } from '../api/customer-picture.js'
import { useH5PageSave } from '../composables/useH5PageSave.js'
import { useH5TemplateDocument } from '../composables/useH5TemplateDocument.js'
import { createImageTextFields } from '../services/image-text-fields.js'
import { createH5TextInputController, supportsMultilineInput } from '../services/text-input-rules.js'

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
  },
  imagePickerSheet: {
    type: Boolean,
    default: false
  },
  imageCrop: {
    type: Boolean,
    default: false
  },
  separateTextInputs: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const canvasViewportRef = ref(null)
const albumInputRef = ref(null)
const cameraInputRef = ref(null)
const canvasLoaded = ref(false)
const imageReplacing = ref(false)
const imagePreviewUrl = ref('')
const hasUploadedImage = ref(false)
const showImagePickerSheet = ref(false)
const showImageCropDialog = ref(false)
const cropSourceFile = ref(null)
const cropSourceUrl = ref('')
const cropOutputType = ref('jpeg')
const cropAspectRatio = ref([1, 1])
const textFields = ref([])
const hasImageTarget = ref(false)
const hasTextTarget = ref(false)
const operationStatus = ref({ type: 'success', text: '' })
const textInputController = createH5TextInputController()
const {
  documentData,
  templateLoading,
  templateError,
  handleCanvasError: handleTemplateCanvasError,
  loadTemplateFromRoute
} = useH5TemplateDocument({ errorLabel: props.pageId })
const {
  redirecting,
  saving,
  saveProgressText,
  saveStatus,
  resetSaveStatus,
  savePage
} = useH5PageSave({
  route,
  pageId: props.pageId,
  defaultDesignName: props.pageTitle,
  getEditor: getCanvasEditor
})

const canvasFrameStyle = computed(() => {
  const width = Number(documentData.value?.canvas?.width)
  const height = Number(documentData.value?.canvas?.height)

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return { aspectRatio: '1 / 1' }
  }

  return {
    aspectRatio: `${width} / ${height}`
  }
})

const canPickImage = computed(() => {
  return canvasLoaded.value && !imageReplacing.value && !saving.value &&
    !redirecting.value && !showImageCropDialog.value
})

const canSubmit = computed(() => {
  return (
    canvasLoaded.value &&
    !templateLoading.value &&
    !imageReplacing.value &&
    !saving.value &&
    !redirecting.value &&
    !showImageCropDialog.value
  )
})

/** @returns {Object | null} 当前画布编辑器实例。 */
function getCanvasEditor() {
  return canvasViewportRef.value?.getEditor?.() ?? null
}

/** @returns {Promise<void>} 根据路由模板 ID 加载 customer 模板。 */
async function reloadTemplate() {
  resetPageState()
  await loadTemplateFromRoute(route.query)
}

/** @returns {void} 清理上一个模板的页面状态。 */
function resetPageState() {
  canvasLoaded.value = false
  imagePreviewUrl.value = ''
  hasUploadedImage.value = false
  showImagePickerSheet.value = false
  resetImageCropState()
  textFields.value = []
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

  hasImageTarget.value = imageTargets.length > 0
  hasTextTarget.value = textTargets.length > 0
  imagePreviewUrl.value = String(editor.image?.getSource?.(imageTargets[0]) ?? '')
  cropAspectRatio.value = resolveCropAspectRatio(imageTargets[0])
  textFields.value = props.separateTextInputs
    ? createImageTextFields(payload.document, textTargets, {
      pageId: props.pageId,
      separate: true,
      textDescription: props.textDescription
    })
    : []
  canvasLoaded.value = true
  templateError.value = ''

  if (props.imagePickerSheet && !hasUploadedImage.value && hasImageTarget.value) {
    showImagePickerSheet.value = true
  }

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
function handleUploadButtonClick() {
  if (!canPickImage.value) {
    return
  }

  if (props.imagePickerSheet) {
    showImagePickerSheet.value = true
    return
  }

  openImagePicker('album')
}

/**
 * 打开指定图片来源的系统选择器。
 *
 * @param {'album' | 'camera'} source 图片来源。
 * @returns {void}
 */
function openImagePicker(source) {
  if (!canPickImage.value) {
    return
  }

  if (!hasImageTarget.value) {
    operationStatus.value = {
      type: 'warning',
      text: `模板未配置“${props.imageDescription}”标记。`
    }
    closeImagePickerSheet()
    return
  }

  showImagePickerSheet.value = false
  const input = source === 'camera' ? cameraInputRef.value : albumInputRef.value
  input?.click()
}

/** @returns {void} 关闭图片选择面板。 */
function closeImagePickerSheet() {
  showImagePickerSheet.value = false
}

/**
 * @param {Event} event 文件选择事件。
 * @returns {Promise<void>} 图片上传和替换完成。
 */
async function handleImageChange(event) {
  const file = event.target.files?.[0]
  const editor = getCanvasEditor()

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

  if (event.target instanceof HTMLInputElement) {
    event.target.value = ''
  }
  if (props.imageCrop) {
    openImageCropDialog(file)
    return
  }

  await uploadAndReplaceImage(file)
}

/** @param {File} file 用户选择的原始图片。 @returns {void} 打开裁剪弹框。 */
function openImageCropDialog(file) {
  resetImageCropState()
  cropSourceFile.value = file
  cropOutputType.value = file.type === 'image/jpeg' ? 'jpeg' : 'png'
  cropSourceUrl.value = URL.createObjectURL(file)
  showImageCropDialog.value = true
  operationStatus.value = { type: 'success', text: '' }
}

/** @returns {void} 关闭裁剪弹框并释放本地图片地址。 */
function closeImageCropDialog() {
  if (!imageReplacing.value) {
    resetImageCropState()
  }
}

/** @returns {void} 清理裁剪弹框状态和对象 URL。 */
function resetImageCropState() {
  showImageCropDialog.value = false
  cropSourceFile.value = null
  if (cropSourceUrl.value) {
    URL.revokeObjectURL(cropSourceUrl.value)
  }
  cropSourceUrl.value = ''
  cropOutputType.value = 'jpeg'
}

/** @param {Blob} blob 裁剪结果。 @returns {Promise<void>} 上传并替换画布图片。 */
async function handleCropConfirm(blob) {
  const croppedFile = createCroppedImageFile(blob, cropSourceFile.value, cropOutputType.value)
  const replaced = await uploadAndReplaceImage(croppedFile)
  if (replaced) {
    resetImageCropState()
  }
}

/**
 * 上传图片并使用服务端 URL 替换全部目标节点。
 *
 * @param {File | Blob} file 待上传图片。
 * @returns {Promise<boolean>} 是否上传并替换成功。
 */
async function uploadAndReplaceImage(file) {
  const editor = getCanvasEditor()
  if (!editor || !hasImageTarget.value) {
    return false
  }

  imageReplacing.value = true
  operationStatus.value = { type: 'success', text: '' }
  try {
    const imageUrl = await customerPictureApi.upload(file)
    const targets = getImageTargets(editor)

    await Promise.all(
      targets.map((target) =>
        editor.replaceImage(target, imageUrl, {
          fit: 'contain',
          allowLocked: true
        })
      )
    )
    imagePreviewUrl.value = imageUrl
    hasUploadedImage.value = true
    showImagePickerSheet.value = false
    operationStatus.value = { type: 'success', text: '图片已更新' }
    return true
  } catch (error) {
    console.error(`${props.pageId} image replacement failed.`, error)
    operationStatus.value = { type: 'error', text: error.message || '图片上传失败，请重试。' }
    return false
  } finally {
    imageReplacing.value = false
  }
}

/**
 * @param {Blob} blob 裁剪结果。
 * @param {File | null} sourceFile 原始文件。
 * @param {'jpeg' | 'png'} outputType 输出格式。
 * @returns {File} 带文件名的裁剪图片。
 */
function createCroppedImageFile(blob, sourceFile, outputType) {
  const baseName = String(sourceFile?.name ?? 'image').replace(/\.[^.]+$/, '') || 'image'
  const extension = outputType === 'png' ? 'png' : 'jpg'
  const mimeType = blob.type || `image/${outputType}`
  return new File([blob], `${baseName}-cropped.${extension}`, { type: mimeType })
}

/** @param {Object | undefined} target 图片目标节点。 @returns {[number, number]} 裁剪宽高比。 */
function resolveCropAspectRatio(target) {
  const width = Number(target?.width)
  const height = Number(target?.height)
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    ? [width, height]
    : [1, 1]
}

/** @param {Object} field 文本输入项。 @param {Event} event 输入事件。 @returns {void} */
function handleTextInput(field, event) {
  textInputController.handleInput(event, field.rules, (nextValue) => {
    applyTextFieldValue(field, nextValue)
  })
}

/** @param {Object} field 文本输入项。 @param {string} nextValue 过滤后的文字。 @returns {void} */
function applyTextFieldValue(field, nextValue) {
  field.value = nextValue
  const editor = getCanvasEditor()
  if (!editor || !canvasLoaded.value) {
    return
  }

  resolveFieldTargets(editor, field).forEach((target) => {
    if (String(target.text ?? '') !== nextValue) {
      editor.replaceTextWithRules(target, nextValue)
    }
  })
}

/** @param {CompositionEvent} event 输入法组合开始事件。 @returns {void} */
function handleTextCompositionStart(event) {
  textInputController.handleCompositionStart(event)
}

/** @param {Object} field 文本输入项。 @param {CompositionEvent} event 组合输入结束事件。 @returns {void} */
function handleTextCompositionEnd(field, event) {
  textInputController.handleCompositionEnd(event, field.rules, (nextValue) => {
    applyTextFieldValue(field, nextValue)
  })
}

/** @param {Object} field 文本输入项。 @returns {boolean} 是否使用多行输入。 */
function isTextInputMultiline(field) {
  return supportsMultilineInput(field.rules)
}

/**
 * @param {Object} editor 核心编辑器实例。
 * @param {Object} field 文本输入项。
 * @returns {Object[]} 输入项对应的画布节点。
 */
function resolveFieldTargets(editor, field) {
  const targets = getTextTargets(editor)

  return field.targetIndexes.map((index) => targets[index]).filter(Boolean)
}

/** @returns {Promise<void>} 生成保存数据并通知小程序。 */
async function onSubmit() {
  const editor = getCanvasEditor()
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

watch(
  () => [route.query.templateId, route.query.partnerId],
  () => {
    void reloadTemplate()
  },
  { immediate: true }
)

onBeforeUnmount(resetImageCropState)
</script>

<style lang="scss" scoped>
.customization-page {
  position: relative;
  display: flex;
  width: min(100%, 430px);
  height: 100vh;
  min-height: 0;
  margin: 0 auto;
  overflow-x: hidden;
  overflow-y: auto;
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
  display: flex;
  width: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  background: #f4f5f6;
}

.canvas-frame {
  position: relative;
  width: 100%;
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
  width: 100%;
  min-height: 0;
  aspect-ratio: 1;
}

.preview-state.is-error {
  color: #a22b31;
  text-align: center;
}

.form-section {
  display: flex;
  padding: 22px 20px 28px;
  overflow-y: auto;
  flex: 1 0 220px;
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
  transition:
    background-color 160ms ease-out,
    color 160ms ease-out;
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
  transition:
    border-color 160ms ease-out,
    box-shadow 160ms ease-out;
}

.text-input-list {
  display: grid;
  gap: 12px;
}

.text-input-field {
  display: grid;
  gap: 6px;
}

.text-input-field > span {
  color: #555555;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

textarea.text-input {
  height: auto;
  min-height: 82px;
  padding: 9px 11px;
  line-height: 1.55;
  resize: vertical;
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

.save-error {
  margin: 0 0 8px;
  color: #a22b31;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
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

.image-picker-backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(18, 18, 18, 0.28);
}

.image-picker-sheet {
  position: relative;
  width: min(100%, 430px);
  padding: 10px 20px calc(18px + env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  color: #282828;
  background: #ffffff;
  box-shadow: 0 -8px 24px rgba(18, 18, 18, 0.12);
}

.sheet-handle {
  display: block;
  width: 34px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: #d9d9d9;
}

.sheet-close {
  position: absolute;
  top: 10px;
  right: 14px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  padding: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: #707070;
  background: transparent;
  cursor: pointer;
}

.sheet-close:hover {
  color: #242424;
  background: #f4f4f4;
}

.image-picker-sheet h2 {
  margin: 0 42px 16px;
  color: #242424;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
}

.image-picker-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.image-picker-option {
  display: flex;
  min-height: 104px;
  padding: 14px 8px 12px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #f4dce3;
  border-radius: 9px;
  color: #242424;
  background: #fff0f4;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.image-picker-option:hover {
  border-color: #e9b9c5;
  background: #ffe8ee;
}

.image-picker-option:active {
  transform: translateY(1px);
}

.image-picker-option:focus-visible,
.sheet-close:focus-visible {
  outline: 2px solid #d61f35;
  outline-offset: 2px;
}

.image-picker-icon {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  color: #d61f35;
}

.picker-sheet-enter-active,
.picker-sheet-leave-active {
  transition: opacity 180ms ease;
}

.picker-sheet-enter-active .image-picker-sheet,
.picker-sheet-leave-active .image-picker-sheet {
  transition: transform 220ms ease;
}

.picker-sheet-enter-from,
.picker-sheet-leave-to {
  opacity: 0;
}

.picker-sheet-enter-from .image-picker-sheet,
.picker-sheet-leave-to .image-picker-sheet {
  transform: translateY(100%);
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
  .form-section {
    padding-block: 18px;
    flex-basis: 200px;
    gap: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .secondary-button,
  .text-input,
  .image-picker-option,
  .picker-sheet-enter-active,
  .picker-sheet-leave-active,
  .picker-sheet-enter-active .image-picker-sheet,
  .picker-sheet-leave-active .image-picker-sheet {
    transition: none;
  }

  .spinner {
    animation-duration: 1.4s;
  }
}
</style>
