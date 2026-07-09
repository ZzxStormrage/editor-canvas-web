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

      <div class="advanced-settings-card">
        <div class="advanced-group">
          <h3>操作</h3>
          <div class="quick-actions">
            <v-btn
              prepend-icon="mdi-image-plus-outline"
              variant="outlined"
              @click="editor.openImagePicker"
            >
              上传图片
            </v-btn>
          </div>
        </div>
      </div>
    </section>

    <section v-show="activePanel === 'text'" class="panel-section text-panel">
      <div class="panel-heading">
        <span>文字</span>
        <v-chip class="font-size-chip" color="control" size="small" variant="flat">
          {{ editor.fontSize.value }} px
        </v-chip>
      </div>

      <v-btn
        class="add-text-button"
        block
        color="primary"
        height="42"
        prepend-icon="mdi-format-textbox"
        @click="editor.addText"
      >
        添加文本框
      </v-btn>

      <div class="advanced-settings-card">
        <div class="advanced-group">
          <h3>内容</h3>
          <v-text-field v-model="editor.textValue.value" label="文字内容" />
          <v-select
            v-model="editor.fontFamily.value"
            :items="editor.fontOptions"
            label="字体"
          />
        </div>

        <div class="advanced-group">
          <h3>字号与字重</h3>
          <div class="slider-field">
            <label>字号</label>
            <div class="slider-row">
              <v-slider
                v-model.number="editor.fontSize.value"
                max="240"
                min="8"
                step="1"
              />
              <v-text-field
                v-model.number="editor.fontSize.value"
                class="value-field"
                label="字号"
                type="number"
                min="8"
                max="240"
              />
            </div>
          </div>

          <v-btn-toggle
            v-model="editor.fontWeight.value"
            class="option-toggle option-toggle--three"
            color="primary"
            divided
            mandatory
          >
            <v-btn
              v-for="item in fontWeightOptions"
              :key="item.value"
              class="option-toggle-button"
              :value="item.value"
            >
              {{ item.label }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="advanced-group">
          <h3>样式</h3>
          <div class="style-toolbar">
            <v-btn
              :color="editor.italic.value ? 'primary' : 'text'"
              :variant="editor.italic.value ? 'tonal' : 'outlined'"
              class="style-icon-button"
              height="36"
              icon="mdi-format-italic"
              aria-label="斜体"
              @click="editor.italic.value = !editor.italic.value"
            />
            <v-btn
              :color="editor.underline.value ? 'primary' : 'text'"
              :variant="editor.underline.value ? 'tonal' : 'outlined'"
              class="style-icon-button"
              height="36"
              icon="mdi-format-underline"
              aria-label="下划线"
              @click="editor.underline.value = !editor.underline.value"
            />
            <v-btn
              :color="editor.lineThrough.value ? 'primary' : 'text'"
              :variant="editor.lineThrough.value ? 'tonal' : 'outlined'"
              class="style-icon-button"
              height="36"
              icon="mdi-format-strikethrough"
              aria-label="删除线"
              @click="editor.lineThrough.value = !editor.lineThrough.value"
            />
          </div>

          <v-text-field
            v-model="editor.textColor.value"
            label="文字颜色"
          >
            <template #append-inner>
              <span
                class="color-value-preview"
                :style="{ backgroundColor: editor.textColor.value }"
              ></span>
            </template>
          </v-text-field>
        </div>

        <div class="advanced-group">
          <h3>排版</h3>
          <div class="setting-row">
            <label>对齐</label>
            <v-btn-toggle
              v-model="editor.textAlign.value"
              class="option-toggle option-toggle--three"
              color="primary"
              divided
              mandatory
            >
              <v-btn
                v-for="item in alignOptions"
                :key="item.value"
                class="option-toggle-button"
                :value="item.value"
              >
                {{ item.label }}
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="setting-row">
            <label>方向</label>
            <v-btn-toggle
              v-model="editor.writingMode.value"
              class="option-toggle option-toggle--two"
              color="primary"
              divided
              mandatory
            >
              <v-btn
                v-for="item in writingModeOptions"
                :key="item.value"
                class="option-toggle-button"
                :value="item.value"
              >
                {{ item.label }}
              </v-btn>
            </v-btn-toggle>
          </div>
        </div>

        <div class="advanced-group">
          <h3>高级设置</h3>
          <div class="slider-field">
            <label>字距</label>
            <div class="slider-row">
              <v-slider
                v-model.number="editor.letterSpacing.value"
                max="120"
                min="0"
                step="1"
              />
              <v-text-field
                v-model.number="editor.letterSpacing.value"
                class="value-field"
                label="字距"
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
                max="300"
                min="8"
                step="1"
              />
              <v-text-field
                v-model.number="editor.lineHeight.value"
                class="value-field"
                label="行高"
                type="number"
                min="8"
                max="300"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-show="activePanel === 'watermark'" class="panel-section">
      <div class="panel-heading">
        <span>水印</span>
      </div>

      <div class="advanced-settings-card">
        <div class="advanced-group">
          <h3>内容</h3>
          <v-text-field v-model="editor.watermarkValue.value" label="水印文字" />
        </div>

        <div class="advanced-group">
          <h3>操作</h3>
          <div class="quick-actions two-actions">
            <v-btn
              prepend-icon="mdi-water-percent"
              variant="outlined"
              @click="editor.addWatermark"
            >
              添加水印
            </v-btn>
            <v-btn
              color="error"
              prepend-icon="mdi-delete-outline"
              variant="outlined"
              @click="editor.deleteWatermark"
            >
              删除水印
            </v-btn>
          </div>
        </div>
      </div>
    </section>

    <section v-show="activePanel === 'artboard'" class="panel-section">
      <div class="panel-heading">
        <span>画板</span>
        <span class="panel-size">{{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }}</span>
      </div>

      <div class="advanced-settings-card">
        <div class="advanced-group">
          <h3>尺寸</h3>
          <div class="panel-grid">
            <v-text-field
              v-model.number="editor.artboardWidth.value"
              label="宽度"
              type="number"
              min="120"
            />
            <v-text-field
              v-model.number="editor.artboardHeight.value"
              label="高度"
              type="number"
              min="120"
            />
          </div>
        </div>

        <div class="advanced-group">
          <h3>操作</h3>
          <v-btn
            block
            prepend-icon="mdi-resize"
            variant="outlined"
            @click="editor.updateArtboardSize"
          >
            调整画布
          </v-btn>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup>
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
