<template>
  <section class="panel-section">
    <input
      :ref="setBackgroundInputRef"
      class="side-file-input"
      type="file"
      accept="image/*"
      :disabled="editor.backgroundUploading.value"
      @change="editor.handleBackgroundImageChange"
    />
    <input
      :ref="setMaskInputRef"
      class="side-file-input"
      type="file"
      accept="image/*"
      :disabled="editor.maskUploading.value"
      @change="editor.handleMaskImageChange"
    />

    <div class="panel-heading">
      <span>画板</span>
      <span class="panel-size">
        {{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }}
      </span>
    </div>
    <div class="panel-subtext">
      {{ editor.artboardMillimeterSize.value }}
    </div>

    <PanelGroup>
      <div class="panel-grid">
        <div class="slider-field">
          <label>宽度</label>
          <v-number-input
            v-model.number="editor.artboardWidth.value"
            aria-label="宽度"
            label=""
            :min="120"
            :step="1"
          />
        </div>
        <div class="slider-field">
          <label>高度</label>
          <v-number-input
            v-model.number="editor.artboardHeight.value"
            aria-label="高度"
            label=""
            :min="120"
            :step="1"
          />
        </div>
      </div>
    </PanelGroup>

    <PanelGroup>
      <div class="canvas-action-stack">
        <v-btn
          block
          class="editor-action-button canvas-action-button"
          density="compact"
          prepend-icon="mdi-crop-free"
          variant="outlined"
          @click="editor.updateArtboardSize"
        >
          调整画布
        </v-btn>
        <div class="quick-actions two-actions">
          <v-btn
            class="editor-action-button canvas-action-button"
            color="primary"
            density="compact"
            :disabled="editor.backgroundUploading.value"
            :loading="editor.backgroundUploading.value"
            prepend-icon="mdi-image-plus-outline"
            variant="tonal"
            @click="editor.openBackgroundImagePicker"
          >
            背景图
          </v-btn>
          <v-btn
            class="editor-action-button canvas-action-button"
            color="secondary"
            density="compact"
            :disabled="editor.maskUploading.value"
            :loading="editor.maskUploading.value"
            prepend-icon="mdi-image-filter-center-focus"
            variant="tonal"
            @click="editor.openMaskImagePicker"
          >
            遮罩图
          </v-btn>
        </div>
      </div>
    </PanelGroup>

    <PanelGroup>
      <div class="panel-tool-heading">
        <span>打印区域</span>
        <span>{{ editor.printAreaMillimeterSize.value }}</span>
      </div>

      <div class="print-area-actions">
        <v-btn
          class="editor-action-button"
          color="primary"
          density="compact"
          prepend-icon="mdi-printer-outline"
          variant="tonal"
          @click="editor.addPrintArea"
        >
          添加
        </v-btn>
        <v-btn
          class="editor-action-button"
          color="secondary"
          density="compact"
          :disabled="editor.maskUploading.value"
          :loading="editor.printAreaDetecting.value"
          prepend-icon="mdi-selection-search"
          variant="tonal"
          @click="editor.detectPrintAreaFromMask"
        >
          自动识别
        </v-btn>
        <v-btn
          class="editor-action-button"
          color="error"
          density="compact"
          prepend-icon="mdi-delete-outline"
          variant="tonal"
          @click="editor.deletePrintArea"
        >
          删除
        </v-btn>
      </div>

      <div class="panel-grid">
        <PanelNumberField
          v-model="editor.printAreaX.value"
          label="X 坐标"
          suffix="px"
        />
        <PanelNumberField
          v-model="editor.printAreaY.value"
          label="Y 坐标"
          suffix="px"
        />
        <PanelNumberField
          v-model="editor.printAreaWidth.value"
          label="宽度"
          suffix="px"
          :min="1"
        />
        <PanelNumberField
          v-model="editor.printAreaHeight.value"
          label="高度"
          suffix="px"
          :min="1"
        />
      </div>
    </PanelGroup>

  </section>
</template>

<script setup>
import PanelGroup from '../PanelGroup.vue';
import PanelNumberField from '../PanelNumberField.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

/**
 * 把背景图上传 input 的 DOM 引用交回组合式逻辑。
 *
 * @param {HTMLInputElement | null} element 文件选择 input 元素。
 * @returns {void}
 */
function setBackgroundInputRef(element) {
  if (props.editor?.backgroundInputRef) {
    props.editor.backgroundInputRef.value = element;
  }
}

/**
 * 把遮罩图上传 input 的 DOM 引用交回组合式逻辑。
 *
 * @param {HTMLInputElement | null} element 文件选择 input 元素。
 * @returns {void}
 */
function setMaskInputRef(element) {
  if (props.editor?.maskInputRef) {
    props.editor.maskInputRef.value = element;
  }
}
</script>

<style scoped>
.print-area-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.print-area-actions :deep(.v-btn__content) {
  font-size: 11px;
}
</style>
