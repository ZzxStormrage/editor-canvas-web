<template>
  <main class="poetry-page">
    <h1 class="visually-hidden">{{ props.pageTitle }}</h1>

    <section class="preview-section" :aria-label="`${props.pageTitle}效果预览`">
      <div v-if="documentData && !templateLoading" class="canvas-frame" :style="canvasFrameStyle">
        <CanvasDocumentViewport
          ref="canvasViewportRef"
          :document="documentData"
          @loaded="handleDocumentLoaded"
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
      <div class="customization-tabs" role="tablist" aria-label="定制类型">
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
          <v-icon icon="mdi-text-box-outline" size="16" />
          <span>{{ props.artTextMode ? '艺术字' : '文案定制' }}</span>
        </button>
      </div>

      <div class="sheet-content">
        <div v-if="activeTab === 'image'" class="image-customization" role="tabpanel">
          <section class="theme-section">
            <div class="section-heading">
              <h2>AI主题</h2>
              <p>选择由商品页面提供的主题图片</p>
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
                <!-- <span class="theme-label">{{ option.label }}</span> -->
              </button>

              <button type="button" class="theme-item add-theme" @click="tryMoreThemes">
                <span class="theme-preview">
                  <v-icon icon="mdi-plus" size="22" />
                </span>
                <span class="theme-label">尝试更多</span>
              </button>
            </div>

            <div v-if="backgroundOptions.length" class="background-section">
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

        <div v-else-if="props.artTextMode" class="copy-customization" role="tabpanel">
          <div class="section-heading">
            <h2>选择艺术字</h2>
            <p>选择后会替换画布中标记为“艺术字”的图片</p>
          </div>

          <div v-if="artTextOptions.length" class="art-text-list" aria-label="艺术字图片">
            <button
              v-for="option in artTextOptions"
              :key="option.id"
              type="button"
              class="art-text-option"
              :class="{ 'is-selected': selectedArtTextId === option.id }"
              :disabled="artTextReplacing || !canvasLoaded"
              :aria-label="`选择${option.label}`"
              @click="selectArtText(option)"
            >
              <img :src="option.url" alt="" />
            </button>
          </div>

          <div v-else class="copy-empty" role="status">
            <v-icon icon="mdi-image-off-outline" size="28" />
            <strong>暂无艺术字图片</strong>
            <span>请先在商品后台配置人像款艺术字图片。</span>
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
        <p v-if="saveStatus.text" class="save-status" :class="`is-${saveStatus.type}`" role="status">
          {{ saveStatus.text }}
        </p>
        <button class="submit-button" type="button" :disabled="!canSubmit" :aria-busy="saving" @click="submitDesign">
          {{ saving ? '保存中...' : '立即购买' }}
        </button>
      </footer>
    </section>

    <div v-if="saving" class="save-overlay" role="status" aria-live="assertive">
      <span class="spinner is-light" aria-hidden="true"></span>
      <span>正在保存...</span>
    </div>
  </main>
</template>

<script setup>
import CanvasDocumentViewport from './components/CanvasDocumentViewport.vue'
import { usePoetryCustomization } from './composables/usePoetryCustomization.js'
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
  artTextMode: {
    type: Boolean,
    default: false
  }
})

const {
  activeTab,
  aiThemeOptions,
  artTextOptions,
  artTextReplacing,
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
  saveStatus,
  saving,
  selectAiTheme,
  selectArtText,
  selectBackground,
  selectedAiThemeId,
  selectedArtTextId,
  selectedBackgroundId,
  setImageFit,
  showAdvancedSettings,
  submitDesign,
  templateError,
  templateLoading,
  textFields,
  tryMoreThemes,
  updateTextField
} = usePoetryCustomization({
  pageId: props.pageId,
  defaultDesignName: props.defaultDesignName,
  artTextMode: props.artTextMode,
  imageTargetDescriptions: props.imageTargetDescriptions,
  replacementTextLabel: props.replacementTextLabel,
  titleTextLabel: props.titleTextLabel
})

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
  margin-top: 8px;
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
  height: 40px;
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

.art-text-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.art-text-option {
  width: 100%;
  aspect-ratio: 1;
  padding: 3px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #f1f2f4;
  cursor: pointer;
}

.art-text-option.is-selected {
  border-color: #e6002d;
}

.art-text-option:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.art-text-option img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
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

.operation-status,
.save-status {
  margin: 7px 0 0;
  color: #27724d;
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
}

.operation-status.is-warning,
.operation-status.is-error,
.save-status.is-error {
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
  background: #b7b7b7;
  cursor: not-allowed;
}

.save-status {
  margin: 0 0 6px;
  font-weight: 600;
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
.art-text-option:focus-visible,
.advanced-toggle:focus-visible,
.fit-options button:focus-visible,
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

@media (prefers-reduced-motion: reduce) {
  .customization-tabs button,
  .background-option,
  .copy-field input,
  .copy-field textarea,
  .advanced-settings-enter-active,
  .advanced-settings-leave-active {
    transition: none;
  }

  .spinner {
    animation-duration: 1.4s;
  }
}
</style>
