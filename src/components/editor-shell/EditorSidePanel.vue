<template>
  <aside class="editor-side-panel">
    <component :is="activePanelComponent" :editor="editor" />
  </aside>
</template>

<script setup>
import { computed } from 'vue';

import ArtboardPanel from './side-panels/ArtboardPanel.vue';
import ImagePanel from './side-panels/ImagePanel.vue';
import TextPanel from './side-panels/TextPanel.vue';
import ToolsPanel from './side-panels/ToolsPanel.vue';
import WatermarkPanel from './side-panels/WatermarkPanel.vue';

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

// 面板注册表只负责把左侧导航值映射到具体业务组件。
const panelComponents = {
  image: ImagePanel,
  text: TextPanel,
  watermark: WatermarkPanel,
  artboard: ArtboardPanel,
  tools: ToolsPanel
};

const activePanelComponent = computed(resolveActivePanelComponent);

/**
 * 根据当前导航值解析需要展示的侧边栏面板。
 *
 * @returns {Object} Vue 组件对象；未知面板值时回退到文字面板。
 */
function resolveActivePanelComponent() {
  return panelComponents[props.activePanel] ?? TextPanel;
}
</script>
