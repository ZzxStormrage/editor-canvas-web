<template>
  <aside class="editor-side-panel">
    <input
      :ref="setImageInputRef"
      class="side-file-input"
      type="file"
      accept="image/*"
      @change="editor.handleImageChange"
    />

    <section v-show="activePanel === 'image'" class="panel-section">
      <div class="panel-heading">
        <span>图片</span>
      </div>
      <div class="quick-actions">
        <v-btn prepend-icon="mdi-image-plus-outline" variant="outlined" @click="editor.openImagePicker">
          上传图片
        </v-btn>
      </div>
    </section>

    <section v-show="activePanel === 'text'" class="panel-section text-panel">
      <template v-if="!showTextAdvanced">
        <div class="panel-heading">
          <span>文字</span>
          <v-chip class="font-size-chip" size="small" variant="flat">{{ editor.fontSize.value }} px</v-chip>
        </div>

        <v-btn class="add-text-button" block prepend-icon="mdi-format-textbox" @click="editor.addText">
          添加文本框
        </v-btn>
        <v-text-field v-model="editor.textValue.value" class="primary-text-field" label="文字内容" />
        <v-select v-model="editor.fontFamily.value" :items="editor.fontOptions" label="字体" />

        <div class="panel-grid">
          <v-text-field v-model.number="editor.fontSize.value" label="字号" type="number" min="8" max="240" />
          <v-select
            v-model="editor.fontWeight.value"
            :items="fontWeightOptions"
            item-title="label"
            item-value="value"
            label="字重"
          />
        </div>

        <div class="panel-grid">
          <v-text-field v-model.number="editor.letterSpacing.value" label="字距" type="number" min="0" max="120" />
          <v-text-field v-model.number="editor.lineHeight.value" label="行高" type="number" min="8" max="300" />
        </div>

        <div class="panel-grid">
          <v-select
            v-model="editor.textAlign.value"
            :items="alignOptions"
            item-title="label"
            item-value="value"
            label="对齐"
          />
          <v-select
            v-model="editor.writingMode.value"
            :items="writingModeOptions"
            item-title="label"
            item-value="value"
            label="方向"
          />
        </div>

        <div class="style-toolbar">
          <v-btn
            :active="editor.italic.value"
            class="style-icon-button"
            icon="mdi-format-italic"
            variant="outlined"
            aria-label="斜体"
            @click="editor.italic.value = !editor.italic.value"
          />
          <v-btn
            :active="editor.underline.value"
            class="style-icon-button"
            icon="mdi-format-underline"
            variant="outlined"
            aria-label="下划线"
            @click="editor.underline.value = !editor.underline.value"
          />
          <v-btn
            :active="editor.lineThrough.value"
            class="style-icon-button"
            icon="mdi-format-strikethrough"
            variant="outlined"
            aria-label="删除线"
            @click="editor.lineThrough.value = !editor.lineThrough.value"
          />
          <label class="color-picker">
            <v-icon icon="mdi-format-color-text" />
            <input v-model="editor.textColor.value" type="color" aria-label="文字颜色" />
          </label>
        </div>

        <v-btn class="advanced-entry-button" block variant="text" append-icon="mdi-chevron-right" @click="openTextAdvanced">
          高级设置
        </v-btn>
      </template>

      <template v-else>
        <div class="advanced-panel-header">
          <strong>高级设置</strong>
          <v-btn icon="mdi-close" variant="text" aria-label="返回文字设置" @click="closeTextAdvanced" />
        </div>

        <div class="advanced-settings-card">
          <div class="advanced-group">
            <h3>间距</h3>
            <div class="slider-field">
              <label>字距</label>
              <div class="slider-row">
                <v-slider
                  v-model.number="editor.letterSpacing.value"
                  color="primary"
                  hide-details
                  max="120"
                  min="0"
                  step="1"
                />
                <input
                  v-model.number="editor.letterSpacing.value"
                  aria-label="字距数值"
                  class="native-value-input"
                  type="number"
                  min="0"
                  max="120"
                />
              </div>
            </div>

            <div class="slider-field">
              <label>行高</label>
              <div class="slider-row">
                <v-slider
                  v-model.number="editor.lineHeight.value"
                  color="primary"
                  hide-details
                  max="300"
                  min="8"
                  step="1"
                />
                <input
                  v-model.number="editor.lineHeight.value"
                  aria-label="行高数值"
                  class="native-value-input"
                  type="number"
                  min="8"
                  max="300"
                />
              </div>
            </div>
          </div>

          <div class="advanced-group">
            <h3>说明</h3>
            <p>这里只保留当前文字引擎已支持的高级参数。</p>
          </div>
        </div>
      </template>
    </section>

    <section v-show="activePanel === 'watermark'" class="panel-section">
      <div class="panel-heading">
        <span>水印</span>
      </div>
      <v-text-field v-model="editor.watermarkValue.value" label="水印文字" />
      <div class="quick-actions">
        <v-btn prepend-icon="mdi-water-percent" variant="outlined" @click="editor.addWatermark">
          添加水印
        </v-btn>
        <v-btn color="error" prepend-icon="mdi-delete-outline" variant="outlined" @click="editor.deleteWatermark">
          删除水印
        </v-btn>
      </div>
    </section>

    <section v-show="activePanel === 'artboard'" class="panel-section">
      <div class="panel-heading">
        <span>画板</span>
        <span class="panel-size">{{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }}</span>
      </div>
      <div class="panel-grid">
        <v-text-field v-model.number="editor.artboardWidth.value" label="宽度" type="number" min="120" />
        <v-text-field v-model.number="editor.artboardHeight.value" label="高度" type="number" min="120" />
      </div>
      <v-btn block prepend-icon="mdi-resize" variant="outlined" @click="editor.updateArtboardSize">
        调整画布
      </v-btn>
    </section>
  </aside>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  activePanel: {
    type: String,
    required: true
  },
  editor: {
    type: Object,
    required: true
  }
});

const showTextAdvanced = ref(false);

const fontWeightOptions = [
  { label: '常规', value: '400' },
  { label: '中等', value: '500' },
  { label: '加粗', value: '700' }
];

const alignOptions = [
  { label: '左对齐', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'right' }
];

const writingModeOptions = [
  { label: '横版', value: 'x' },
  { label: '竖版', value: 'y' }
];

/**
 * 打开文字高级设置面板。
 *
 * @returns {void}
 */
function openTextAdvanced() {
  showTextAdvanced.value = true;
}

/**
 * 关闭文字高级设置面板。
 *
 * @returns {void}
 */
function closeTextAdvanced() {
  showTextAdvanced.value = false;
}

/**
 * 把隐藏 input 的 DOM 引用交回编辑器组合式逻辑。
 *
 * @param {HTMLInputElement | null} element 文件选择 input 元素。
 * @returns {void}
 */
function setImageInputRef(element) {
  if (props.editor?.imageInputRef) {
    props.editor.imageInputRef.value = element;
  }
}
</script>
