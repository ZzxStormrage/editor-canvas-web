<template>
  <section class="panel-section">
    <input
      :ref="setMaskInputRef"
      class="side-file-input"
      type="file"
      accept="image/*"
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
        <v-btn
          block
          class="editor-action-button canvas-action-button"
          color="primary"
          density="compact"
          prepend-icon="mdi-image-plus-outline"
          variant="tonal"
          @click="editor.openMaskImagePicker"
        >
          上传遮罩图
        </v-btn>
      </div>
    </PanelGroup>

    <PanelGroup>
      <div class="panel-tool-heading">
        <span>打印区域</span>
        <span>{{ editor.printAreaMillimeterSize.value }}</span>
      </div>

      <div class="quick-actions two-actions">
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
        <div class="slider-field">
          <label>宽度</label>
          <v-number-input
            v-model.number="editor.printAreaWidth.value"
            aria-label="打印区域宽度"
            label=""
            :min="1"
            :step="1"
          />
        </div>
        <div class="slider-field">
          <label>高度</label>
          <v-number-input
            v-model.number="editor.printAreaHeight.value"
            aria-label="打印区域高度"
            label=""
            :min="1"
            :step="1"
          />
        </div>
      </div>
    </PanelGroup>

    <v-dialog v-model="editor.maskConfirmDialog.value.visible" max-width="360">
      <v-card class="mask-confirm-dialog">
        <v-card-title>图片尺寸过大</v-card-title>
        <v-card-text>
          当前图片为 {{ editor.maskConfirmSizeText.value }}，继续添加会自动调整画布尺寸。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editor.cancelAddMaskImage">
            取消
          </v-btn>
          <v-btn color="primary" variant="flat" @click="editor.confirmAddMaskImage">
            确认
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import PanelGroup from '../PanelGroup.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

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
