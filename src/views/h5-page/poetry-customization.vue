<template>
  <main class="poetry-page">
    <h1 class="visually-hidden">{{ props.pageTitle }}</h1>

    <section class="preview-section" :aria-label="`${props.pageTitle}效果预览`">
      <div v-if="documentData && !templateLoading" class="canvas-frame" :style="canvasFrameStyle">
        <CanvasDocumentViewport
          ref="canvasViewportRef"
          :document="documentData"
          :busy="imageReplacing || materialReplacing || saving || redirecting"
          @loaded="handleDocumentLoaded"
          @image-click="selectImageNode"
          @error="handleCanvasError"
        />
        <div v-if="!canvasLoaded" class="canvas-state" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <span>画布加载中...</span>
        </div>
      </div>

      <div v-else-if="templateLoading" class="preview-placeholder" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>模板加载中...</span>
      </div>

      <div v-else class="preview-placeholder is-error" role="alert">
        {{ templateError || '请提供有效的模板 ID。' }}
      </div>
    </section>

    <section class="customization-sheet" :aria-label="`${props.pageTitle}选项`">
      <div v-if="showCustomizationTabs" class="customization-tabs" role="tablist" aria-label="定制类型">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'image'"
          :class="{ 'is-active': activeTab === 'image' }"
          @click="activeTab = 'image'"
        >
          <v-icon icon="mdi-image-outline" size="16" />
          <span>图片定制</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'text'"
          :class="{ 'is-active': activeTab === 'text' }"
          @click="activeTab = 'text'"
        >
          <v-icon :icon="props.materialGroupMode ? 'mdi-image-multiple-outline' : 'mdi-text-box-outline'" size="16" />
          <span>{{ props.materialGroupMode ? '素材组' : '文案定制' }}</span>
        </button>
      </div>

      <ImageCustomizationPicker
        :model-value="activeImageEntryId"
        :entries="imageEntries"
        :disabled="!canvasLoaded || imageReplacing || materialReplacing || saving || redirecting"
        @update:model-value="selectImageEntry"
      />
      <div class="sheet-content">
        <div v-if="activeTab === 'image'" class="image-customization" role="tabpanel">
          <section class="theme-section">
            <div v-if="aiThemeOptions.length" class="section-heading">
              <h2>已生成主题</h2>
              <p>可切换本次定制中已生成的图片</p>
            </div>

            <div class="theme-list">
              <button
                v-for="option in aiThemeOptions"
                :key="option.id"
                type="button"
                class="theme-item"
                :class="{ 'is-selected': selectedAiThemeId === option.id }"
                :disabled="!canSelectTheme || imageReplacing"
                :aria-busy="imageReplacing && selectedAiThemeId === option.id"
                :aria-label="`选择${option.label}`"
                :title="option.label"
                @click="selectAiTheme(option)"
              >
                <span class="theme-preview">
                  <img :src="option.url" alt="" />
                </span>
              </button>

              <button type="button" class="theme-item add-theme" @click="openAiTopicDialog">
                <span class="theme-preview">
                  <v-icon icon="mdi-plus" size="22" />
                </span>
                <span class="theme-label">尝试更多</span>
              </button>
            </div>

            <div v-if="backgroundOptions.length > 1" class="background-section">
              <h3>选择背景图</h3>
              <div class="background-list" aria-label="背景图片">
                <button
                  v-for="option in backgroundOptions"
                  :key="option.id"
                  type="button"
                  class="background-option"
                  :class="{ 'is-selected': selectedBackgroundId === option.id }"
                  :disabled="!canSelectBackground || imageReplacing"
                  :title="option.label"
                  :aria-label="`选择${option.label}`"
                  @click="selectBackground(option)"
                >
                  <img :src="option.url" alt="" />
                </button>
              </div>
            </div>
          </section>

          <!-- <button
            type="button"
            class="advanced-toggle"
            :aria-expanded="showAdvancedSettings"
            @click="showAdvancedSettings = !showAdvancedSettings"
          >
            <span>高级编辑</span>
            <v-icon :icon="showAdvancedSettings ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
          </button> -->

          <Transition name="advanced-settings">
            <div v-if="showAdvancedSettings" class="advanced-settings">
              <span>图片适配</span>
              <div class="fit-options" role="radiogroup" aria-label="图片适配方式">
                <button
                  type="button"
                  :class="{ 'is-active': imageFit === 'contain' }"
                  :aria-pressed="imageFit === 'contain'"
                  @click="setImageFit('contain')"
                >
                  完整显示
                </button>
                <button
                  type="button"
                  :class="{ 'is-active': imageFit === 'cover' }"
                  :aria-pressed="imageFit === 'cover'"
                  @click="setImageFit('cover')"
                >
                  填满画面
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <div v-else-if="props.materialGroupMode" class="copy-customization" role="tabpanel">
          <div class="section-heading">
            <h2>选择素材</h2>
            <p>选择后会替换模板中绑定对应素材组的图片</p>
          </div>

          <div v-if="materialOptionsLoading" class="copy-empty" role="status" aria-live="polite">
            <span class="spinner" aria-hidden="true"></span>
            <strong>素材加载中...</strong>
          </div>

          <div v-else-if="materialOptionsError" class="copy-empty" role="alert">
            <v-icon icon="mdi-alert-circle-outline" size="28" />
            <strong>{{ materialOptionsError }}</strong>
            <button type="button" class="material-retry" @click="loadMaterialOptions()">重新加载</button>
          </div>

          <div v-else-if="materialOptions.length" class="material-list" aria-label="素材图片">
            <button
              v-for="option in materialOptions"
              :key="option.id"
              type="button"
              class="material-option"
              :class="{ 'is-selected': selectedMaterialId === option.id }"
              :disabled="materialReplacing || !canvasLoaded"
              :aria-label="`选择${option.label}`"
              :title="option.label"
              @click="selectMaterial(option)"
            >
              <img :src="option.url" alt="" />
            </button>
          </div>

          <div v-else class="copy-empty" role="status">
            <v-icon icon="mdi-image-off-outline" size="28" />
            <strong>暂无可用素材</strong>
            <span>请在模板图片图层中绑定素材组，并在素材库中添加图片。</span>
          </div>
        </div>

        <div v-else class="copy-customization" role="tabpanel">
          <div class="section-heading">
            <h2>{{ props.copyHeading }}</h2>
            <p>输入内容会实时更新到画布中对应的文字元素</p>
          </div>

          <div v-if="textFields.length" class="copy-fields">
            <label v-for="field in textFields" :key="field.id" class="copy-field">
              <span>{{ field.label }}</span>
              <textarea
                v-if="field.multiline"
                :value="field.value"
                rows="3"
                :placeholder="`请输入${field.label}`"
                @compositionstart="handleTextCompositionStart"
                @compositionend="handleTextCompositionEnd(field.id, $event)"
                @input="handleTextFieldInput(field.id, $event)"
              ></textarea>
              <input
                v-else
                type="text"
                :value="field.value"
                :placeholder="`请输入${field.label}`"
                @compositionstart="handleTextCompositionStart"
                @compositionend="handleTextCompositionEnd(field.id, $event)"
                @input="handleTextFieldInput(field.id, $event)"
              />
            </label>
          </div>

          <div v-else class="copy-empty" role="status">
            <v-icon icon="mdi-text-box-remove-outline" size="28" />
            <strong>暂无可定制文案</strong>
            <span>请在模板文字元素中配置文字描述。</span>
          </div>
        </div>

        <p v-if="operationStatus.text" class="operation-status" :class="`is-${operationStatus.type}`" role="status">
          {{ operationStatus.text }}
        </p>
      </div>

      <footer class="submit-footer">
        <p v-if="saveStatus.type === 'error' && saveStatus.text" class="save-error" role="alert">
          {{ saveStatus.text }}
        </p>
        <p v-if="submitHint" class="submit-hint" role="status" aria-live="polite">
          {{ submitHint }}
        </p>
        <button
          class="submit-button"
          type="button"
          :disabled="saving || redirecting"
          :aria-busy="saving || redirecting"
          @click="handleSubmitClick"
        >
          {{ saving ? '保存中...' : '立即购买' }}
        </button>
      </footer>
    </section>

    <div v-if="saving || redirecting" class="save-overlay" role="status" aria-live="assertive">
      <span class="spinner is-light" aria-hidden="true"></span>
      <span>{{ saveProgressText }}</span>
    </div>

    <Teleport to="body">
      <Transition name="ai-dialog">
        <div v-show="showAiTopicDialog" class="ai-dialog-backdrop" role="presentation" @click.self="closeAiTopicDialog">
          <section class="ai-dialog" role="dialog" aria-modal="true" aria-label="选择 AI 主题">
            <button
              type="button"
              class="ai-dialog-close"
              aria-label="关闭 AI 主题弹框"
              :disabled="aiGenerating"
              @click="closeAiTopicDialog"
            >
              <v-icon icon="mdi-close" size="20" />
            </button>
            <div class="ai-dialog-content">
              <AiTopic
                ref="aiTopicRef"
                :ai-subject-ids="boundAiSubjectQuery"
                :auto-open-single-topic="shouldOpenInitialAiTopicDialog"
                :disabled="imageReplacing || aiGenerating"
                @error="handleAiTopicError"
                @generated="handleAiGenerated"
                @request-close="closeAiTopicDialog"
                @topics-loaded="handleAiTopicsLoaded"
                @update:generating="handleAiGeneratingChange"
              />
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AiTopic from './components/ai-topic.vue'
import CanvasDocumentViewport from './components/CanvasDocumentViewport.vue'
import ImageCustomizationPicker from './components/ImageCustomizationPicker.vue'
import { usePoetryCustomization } from './composables/usePoetryCustomization.js'
import { readRouteValue } from './services/route-navigation.js'
import { createH5TextInputController } from './services/text-input-rules.js'

const props = defineProps({
  pageTitle: {
    type: String,
    default: '诗词定制'
  },
  pageId: {
    type: String,
    default: 'poetry-customization'
  },
  defaultDesignName: {
    type: String,
    default: '诗词定制'
  },
  copyHeading: {
    type: String,
    default: '编辑诗词文案'
  },
  replacementTextLabel: {
    type: String,
    default: '诗词内容'
  },
  titleTextLabel: {
    type: String,
    default: '诗词标题'
  },
  imageTargetDescriptions: {
    type: Array,
    default: undefined
  },
  materialGroupMode: {
    type: Boolean,
    default: false
  },
  backgroundRole: {
    type: String,
    default: 'background'
  }
})

const route = useRoute()
const aiTopicRef = ref(null)
const aiGenerating = ref(false)
const shouldOpenInitialAiTopicDialog = !readRouteValue(route.query.imageUrl)
const showAiTopicDialog = ref(false)
const aiSubjectIds = computed(() => readRouteValue(route.query.aiSubjectIds))

const {
  activeTab,
  imageEntries,
  activeImageEntryId,
  selectImageEntry,
  selectImageNode,
  addGeneratedTheme,
  boundAiSubjectIds,
  aiThemeOptions,
  loadMaterialOptions,
  materialOptions,
  materialOptionsError,
  materialOptionsLoading,
  materialReplacing,
  backgroundOptions,
  canvasFrameStyle,
  canvasLoaded,
  canvasViewportRef,
  canSelectBackground,
  canSelectTheme,
  canSubmit,
  documentData,
  handleCanvasError,
  handleDocumentLoaded,
  imageFit,
  imageReplacing,
  operationStatus,
  redirecting,
  saveProgressText,
  saveStatus,
  saving,
  selectAiTheme,
  selectMaterial,
  selectBackground,
  selectedAiThemeId,
  selectedMaterialId,
  selectedBackgroundId,
  setImageFit,
  showAdvancedSettings,
  submitBlockedMessage,
  submitDesign,
  templateError,
  templateLoading,
  textFields,
  updateTextField
} = usePoetryCustomization({
  pageId: props.pageId,
  defaultDesignName: props.defaultDesignName,
  materialGroupMode: props.materialGroupMode,
  backgroundRole: props.backgroundRole,
  imageTargetDescriptions: props.imageTargetDescriptions,
  replacementTextLabel: props.replacementTextLabel,
  titleTextLabel: props.titleTextLabel
})

// 主题绑定来自模板图层时，合并到 AI 主题选择组件的查询参数中。
const boundAiSubjectQuery = computed(() => {
  const ids = [aiSubjectIds.value, ...boundAiSubjectIds.value]
    .flatMap((value) => String(value ?? '').split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  return [...new Set(ids)].join(',')
})

const submitHint = ref('')
const showCustomizationTabs = computed(() => {
  return !props.materialGroupMode || materialOptions.value.length > 1
})

watch(showCustomizationTabs, (visible) => {
  if (!visible) activeTab.value = 'image'
}, { immediate: true })

/** @returns {Promise<void>} 提交定制，未就绪时保持按钮可点并告知用户下一步。 */
async function handleSubmitClick() {
  if (!canSubmit.value) {
    submitHint.value = submitBlockedMessage.value || '当前定制尚未准备完成，请稍后再试。'
    return
  }

  submitHint.value = ''
  await submitDesign()
}

/** @param {Object} result AI 主题生成结果。 @returns {Promise<void>} */
async function handleAiGenerated(result) {
  await addGeneratedTheme(result)
  submitHint.value = ''
  showAiTopicDialog.value = false
}

/** @returns {void} */
function openAiTopicDialog() {
  submitHint.value = ''
  if (aiTopicRef.value?.openSingleTopicSource?.()) {
    return
  }
  showAiTopicDialog.value = true
}

/** @param {Object[]} topics 已加载的 AI 主题。 @returns {void} */
function handleAiTopicsLoaded(topics) {
  if (shouldOpenInitialAiTopicDialog && topics.length !== 1) {
    showAiTopicDialog.value = true
  }
}

/** @param {{ stage?: string }} payload AI 主题错误信息。 @returns {void} */
function handleAiTopicError(payload) {
  if (payload?.stage !== 'topics' || shouldOpenInitialAiTopicDialog) {
    showAiTopicDialog.value = true
  }
}

/** @param {boolean} value AI 生成状态。 @returns {void} */
function handleAiGeneratingChange(value) {
  aiGenerating.value = value
  if (value) {
    showAiTopicDialog.value = true
  }
}

/** @returns {void} */
function closeAiTopicDialog() {
  if (!aiGenerating.value) showAiTopicDialog.value = false
}

const textInputController = createH5TextInputController()

/** @param {string} fieldId 文字字段 ID。 @param {Event} event 输入事件。 @returns {void} */
function handleTextFieldInput(fieldId, event) {
  textInputController.handleInput(event, resolveTextFieldRules(fieldId), (nextValue) => {
    updateTextField(fieldId, nextValue)
  })
}

/** @param {CompositionEvent} event 组合输入开始事件。 @returns {void} */
function handleTextCompositionStart(event) {
  textInputController.handleCompositionStart(event)
}

/** @param {string} fieldId 文字字段 ID。 @param {CompositionEvent} event 事件。 @returns {void} */
function handleTextCompositionEnd(fieldId, event) {
  textInputController.handleCompositionEnd(event, resolveTextFieldRules(fieldId), (nextValue) =>
    updateTextField(fieldId, nextValue)
  )
}

/** @param {string} fieldId 文字字段 ID。 @returns {Object} 对应的输入规则。 */
function resolveTextFieldRules(fieldId) {
  return textFields.value.find((field) => field.id === fieldId)?.rules ?? {}
}
</script>

<style lang="scss" scoped>
.poetry-page {
  position: relative;
  display: flex;
  width: min(100%, 430px);
  height: 100vh;
  min-height: 0;
  margin: 0 auto;
  overflow-x: hidden;
  overflow-y: auto;
  flex-direction: column;
  color: #1f1f1f;
  background: #f1f2f4;
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
  position: relative;
  display: flex;
  width: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  background: #f1f2f4;
}

.canvas-frame,
.preview-placeholder {
  width: 100%;
  background: #a9aaac;
}

.canvas-frame {
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.12);
}

.canvas-frame :deep(.canvas-document-viewport) {
  position: absolute;
  inset: 0;
}

.canvas-state,
.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #545454;
  font-size: 12px;
}

.canvas-state {
  position: absolute;
  z-index: 2;
  inset: 0;
  background: rgba(245, 245, 245, 0.94);
}

.preview-placeholder {
  aspect-ratio: 1;
}

.preview-placeholder.is-error {
  padding: 16px;
  color: #9f2636;
  background: #ffffff;
  line-height: 1.6;
  text-align: center;
}

.customization-sheet {
  position: relative;
  z-index: 4;
  display: flex;
  min-height: 0;
  padding-top: 22px;
  overflow: hidden;
  flex: 1 0 300px;
  flex-direction: column;
  border-radius: 14px 14px 0 0;
  background: #ffffff;
}

.sheet-handle {
  position: absolute;
  top: 10px;
  left: 50%;
  display: block;
  width: 100px;
  height: 4px;
  border-radius: 999px;
  background: #282828;
  transform: translateX(-50%);
}

.customization-tabs {
  display: grid;
  margin: 0 16px 8px;
  padding: 3px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-radius: 10px;
  background: #fff3f3;
}

.customization-tabs button {
  display: inline-flex;
  min-width: 0;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #565656;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 180ms ease-out,
    background-color 180ms ease-out;
}

.customization-tabs button.is-active {
  color: #d9002d;
  background: #ffffff;
}

.sheet-content {
  min-height: 0;
  padding: 0 16px 12px;
  overflow-y: auto;
  flex: 1 1 auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.theme-section {
  padding: 12px 14px 13px;
  border-radius: 10px;
  background: #fff6f7;
}

.section-heading {
  display: grid;
  gap: 2px;
}

.section-heading h2,
.background-section h3 {
  margin: 0;
  color: #202020;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.section-heading p {
  margin: 0;
  color: #5f5f5f;
  font-size: 10px;
  line-height: 1.5;
}

.theme-list {
  display: flex;
  padding-bottom: 2px;
  overflow-x: auto;
  align-items: flex-start;
  gap: 12px;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.theme-item {
  display: grid;
  min-width: 0;
  padding: 0;
  border: 0;
  gap: 5px;
  color: #202020;
  background: transparent;
  font: inherit;
  font-size: 9px;
  cursor: pointer;
}

.theme-item.add-theme {
  flex: 0 0 48px;
}

.theme-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.theme-preview {
  display: flex;
  width: 40px;
  height: 40px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  color: #d9002d;
  background: #e4e5e7;
}

.theme-item.is-selected .theme-preview {
  border: 2px solid #e6002d;
}

.theme-item.add-theme .theme-preview {
  border: 1px dashed #e6002d;
  background: #ffffff;
}

.theme-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.theme-label {
  width: 100%;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-dialog-backdrop {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: flex;
  padding: max(12px, env(safe-area-inset-top)) 0 0;
  align-items: flex-end;
  justify-content: center;
  background: rgba(18, 18, 18, 0.58);
}

.ai-dialog {
  position: relative;
  display: flex;
  width: min(100%, 430px);
  max-height: min(88vh, 720px);
  max-height: min(88dvh, 720px);
  min-height: 280px;
  overflow: hidden;
  flex-direction: column;
  border-radius: 16px 16px 0 0;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.22);
}

.ai-dialog-close {
  position: absolute;
  z-index: 2;
  top: 12px;
  right: 12px;
  display: inline-flex;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  color: #3f3f3f;
  background: #f0f1f2;
  cursor: pointer;
}

.ai-dialog-close:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-dialog-close:active:not(:disabled) {
  background: #e3e4e6;
}

.ai-dialog-content {
  min-height: 0;
  padding: 24px 20px calc(18px + env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.section-heading + .theme-list {
  margin-top: 8px;
}

.ai-dialog-content :deep(.topic-heading) {
  padding-right: 38px;
}

.ai-dialog-enter-active,
.ai-dialog-leave-active {
  transition: opacity 180ms ease-out;
}

.ai-dialog-enter-active .ai-dialog,
.ai-dialog-leave-active .ai-dialog {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ai-dialog-enter-from,
.ai-dialog-leave-to {
  opacity: 0;
}

.ai-dialog-enter-from .ai-dialog,
.ai-dialog-leave-to .ai-dialog {
  transform: translateY(100%);
}

.background-section {
  display: grid;
  margin-top: 10px;
  gap: 8px;
}

.background-list {
  display: flex;
  padding-bottom: 2px;
  overflow-x: auto;
  align-items: center;
  flex-wrap: nowrap;
  gap: 14px;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.background-option {
  flex: 0 0 auto;
  width: 40px;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #e4e5e7;
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.08);
  cursor: pointer;
  transition: border-color 180ms ease-out;
}

.background-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.background-option.is-selected {
  border-color: #e6002d;
}

.background-option img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.advanced-toggle {
  display: flex;
  min-height: 30px;
  margin-left: auto;
  padding: 0 2px;
  border: 0;
  align-items: center;
  gap: 2px;
  color: #3d3d3d;
  background: transparent;
  font: inherit;
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.advanced-settings {
  display: flex;
  min-height: 42px;
  padding: 8px 10px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 8px;
  background: #f5f5f6;
  font-size: 11px;
}

.fit-options {
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  background: #e9e9eb;
}

.fit-options button {
  height: 26px;
  padding: 0 9px;
  border: 0;
  border-radius: 5px;
  color: #535353;
  background: transparent;
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.fit-options button.is-active {
  color: #c80029;
  background: #ffffff;
}

.copy-customization {
  display: grid;
  padding: 10px 2px 0;
  gap: 12px;
}

.copy-fields {
  display: grid;
  gap: 10px;
}

.material-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.material-option {
  width: 100%;
  aspect-ratio: 1;
  padding: 3px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #f1f2f4;
  cursor: pointer;
}

.material-option.is-selected {
  border-color: #e6002d;
}

.material-option:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.material-option img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.material-retry {
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid #d9002d;
  border-radius: 8px;
  color: #d9002d;
  background: #ffffff;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.copy-field {
  display: grid;
  gap: 5px;
}

.copy-field > span {
  color: #303030;
  font-size: 11px;
  font-weight: 600;
}

.copy-field input,
.copy-field textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0 10px;
  border: 1px solid #d5d5d5;
  border-radius: 7px;
  outline: none;
  color: #202020;
  background: #ffffff;
  font: inherit;
  font-size: 12px;
  transition:
    border-color 180ms ease-out,
    box-shadow 180ms ease-out;
}

.copy-field input {
  height: 36px;
}

.copy-field textarea {
  min-height: 76px;
  padding-block: 9px;
  resize: vertical;
  line-height: 1.55;
}

.copy-field input::placeholder,
.copy-field textarea::placeholder {
  color: #737373;
}

.copy-field input:focus,
.copy-field textarea:focus {
  border-color: #d9002d;
  box-shadow: 0 0 0 2px rgba(217, 0, 45, 0.1);
}

.copy-empty {
  display: flex;
  min-height: 120px;
  padding: 18px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  color: #737373;
  background: #f6f6f7;
  font-size: 11px;
  text-align: center;
}

.copy-empty strong {
  color: #303030;
  font-size: 12px;
}

.operation-status {
  margin: 7px 0 0;
  color: #27724d;
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
}

.operation-status.is-warning,
.operation-status.is-error {
  color: #a42635;
}

.submit-footer {
  padding: 8px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #eeeeef;
  background: #ffffff;
}

.submit-button {
  width: 100%;
  height: 42px;
  border: 0;
  border-radius: 5px;
  color: #ffffff;
  background: #e6002d;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.submit-button:disabled {
  cursor: wait;
}

.submit-hint {
  margin: 0 0 6px;
  color: #a42635;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
}

.save-error {
  margin: 0 0 6px;
  color: #a42635;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
}

.save-overlay {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #ffffff;
  background: rgba(18, 18, 18, 0.64);
  font-size: 12px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #d5d5d5;
  border-top-color: #d9002d;
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

.spinner.is-light {
  border-color: rgba(255, 255, 255, 0.42);
  border-top-color: #ffffff;
}

.customization-tabs button:focus-visible,
.theme-item:focus-visible,
.background-option:focus-visible,
.material-option:focus-visible,
.material-retry:focus-visible,
.advanced-toggle:focus-visible,
.fit-options button:focus-visible,
.ai-dialog-close:focus-visible,
.submit-button:focus-visible {
  outline: 2px solid #d9002d;
  outline-offset: 2px;
}

.advanced-settings-enter-active,
.advanced-settings-leave-active {
  transition:
    opacity 180ms ease-out,
    transform 180ms ease-out;
}

.advanced-settings-enter-from,
.advanced-settings-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-height: 650px) {
  .customization-sheet {
    padding-top: 20px;
    flex-basis: 280px;
  }

  .theme-section {
    padding-block: 9px;
  }

  .background-option,
  .theme-preview {
    width: 36px;
    height: 36px;
  }
}

@media (min-width: 431px) {
  .poetry-page {
    box-shadow: 0 0 8px rgba(17, 24, 39, 0.12);
  }
}

@media (hover: hover) {
  .ai-dialog-close:hover:not(:disabled) {
    background: #e7e8ea;
  }
}

@media (prefers-reduced-motion: reduce) {
  .customization-tabs button,
  .background-option,
  .copy-field input,
  .copy-field textarea,
  .advanced-settings-enter-active,
  .advanced-settings-leave-active,
  .ai-dialog-enter-active,
  .ai-dialog-leave-active,
  .ai-dialog-enter-active .ai-dialog,
  .ai-dialog-leave-active .ai-dialog {
    transition: none;
  }

  .spinner {
    animation-duration: 1.4s;
  }
}
</style>
