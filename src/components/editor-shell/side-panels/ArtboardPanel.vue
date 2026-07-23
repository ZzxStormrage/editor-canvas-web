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
      <span class="panel-size"> {{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }} </span>
    </div>
    <div class="panel-subtext">
      {{ editor.artboardMillimeterSize.value }}
    </div>

    <PanelGroup>
      <div class="panel-grid">
        <div class="slider-field">
          <label>宽度</label>
          <v-number-input v-model.number="editor.artboardWidth.value" aria-label="宽度" label="" :min="120" :step="1" />
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
            上传背景图
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
            上传遮罩图
          </v-btn>
        </div>

        <div v-if="roleAssets.length" class="canvas-role-assets" aria-label="已配置生产图片">
          <div
            v-for="asset in roleAssets"
            :key="asset.role"
            class="canvas-role-asset"
          >
            <div class="canvas-role-asset__preview">
              <LayerPreview
                :layer="asset.layer"
                :load-thumbnail="editor.getLayerThumbnail"
              />
            </div>
            <div class="canvas-role-asset__info">
              <strong>{{ asset.label }}</strong>
              <span :title="asset.layer.name">{{ asset.layer.name }}</span>
            </div>
            <v-btn
              class="canvas-role-asset__replace"
              color="primary"
              density="compact"
              :disabled="isRoleUploading(asset.role)"
              :loading="isRoleUploading(asset.role)"
              prepend-icon="mdi-image-sync-outline"
              size="small"
              variant="tonal"
              @click="editor.openRoleImageReplacementPicker(asset.role)"
            >
              替换
            </v-btn>
          </div>
        </div>
      </div>
    </PanelGroup>

    <PanelGroup>
      <div class="panel-tool-heading production-area-heading">
        <span>生产文件区域</span>
        <strong class="production-area-size">{{ editor.printAreaMillimeterSize.value }}</strong>
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
        <PanelNumberField v-model="editor.printAreaX.value" label="X 坐标" suffix="px" />
        <PanelNumberField v-model="editor.printAreaY.value" label="Y 坐标" suffix="px" />
        <PanelNumberField v-model="editor.printAreaWidth.value" label="宽度" suffix="px" :min="1" />
        <PanelNumberField v-model="editor.printAreaHeight.value" label="高度" suffix="px" :min="1" />
      </div>
    </PanelGroup>
  </section>
</template>

<script setup>
import { computed } from 'vue'

import PanelGroup from '../PanelGroup.vue'
import PanelNumberField from '../PanelNumberField.vue'
import LayerPreview from '../layers/LayerPreview.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

const ROLE_CONFIG = Object.freeze([
  { role: 'background', label: '背景图' },
  { role: 'mask', label: '遮罩图' }
])

const roleAssets = computed(() => {
  const layers = props.editor.layers?.value ?? []

  return ROLE_CONFIG.flatMap((config) => {
    const layer = layers.find((item) => item.type === 'image' && item.imageRole === config.role)
    return layer ? [{ ...config, layer }] : []
  })
})

/**
 * 判断指定生产图片是否正在上传或替换。
 *
 * @param {'background' | 'mask'} role 图片用途。
 * @returns {boolean} 是否正在处理文件。
 */
function isRoleUploading(role) {
  return role === 'background'
    ? props.editor.backgroundUploading.value
    : props.editor.maskUploading.value
}

/**
 * 把背景图上传 input 的 DOM 引用交回组合式逻辑。
 *
 * @param {HTMLInputElement | null} element 文件选择 input 元素。
 * @returns {void}
 */
function setBackgroundInputRef(element) {
  if (props.editor?.backgroundInputRef) {
    props.editor.backgroundInputRef.value = element
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
    props.editor.maskInputRef.value = element
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

.canvas-role-assets {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.canvas-role-asset {
  display: flex;
  min-width: 0;
  min-height: 50px;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 7px;
  background: rgba(var(--v-theme-control), 0.44);
}

.canvas-role-asset__preview {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-outline), 0.16);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface), 0.76);
}

.canvas-role-asset__info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.canvas-role-asset__info strong {
  color: var(--editor-text);
  font-size: 11px;
  font-weight: 800;
}

.canvas-role-asset__info span {
  overflow: hidden;
  color: var(--editor-muted);
  font-size: 9px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-role-asset__replace {
  flex: 0 0 auto;
  min-width: 58px;
}

.canvas-role-asset__replace :deep(.v-btn__content) {
  font-size: 10px;
  font-weight: 750;
}

.production-area-heading {
  align-items: flex-end;
}

.production-area-size {
  color: var(--editor-primary);
  font-size: 14px;
  font-weight: 850;
  line-height: 1;
  white-space: nowrap;
}
</style>
