<!--
 * @Author: zzx 452436275@qq.com
 * @Date: 2026-06-10 10:46:37
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-06-22 19:12:26
 * @FilePath: /ele-editor-v2/src/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="editor-shell">
    <div class="canvas-toolbar">
      <input ref="imageInputRef" class="image-input" type="file" accept="image/*" @change="handleImageChange" />
      <button type="button" class="toolbar-button" @click="openImagePicker">上传图片</button>
      <button type="button" class="toolbar-button icon-button" @click="zoomOut">-</button>
      <span class="zoom-value">{{ zoomPercent }}%</span>
      <button type="button" class="toolbar-button icon-button" @click="zoomIn">+</button>
      <button type="button" class="toolbar-button" @click="resetZoom">重置</button>
    </div>
    <div class="container">
      <div ref="canvasRef" class="canvas-view"></div>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { init } from './canvas-editor-core/src/index';

export default {
  setup() {
    const canvasRef = ref(null);
    const imageInputRef = ref(null);
    const zoom = ref(1);
    let editor = null;

    /**
     * 初始化 Leafer 画布。
     *
     * 等 DOM 挂载完成后，把 canvasRef 对应的容器传给 canvas-editor-core 的 init 方法。
     */
    const initCanvas = () => {
      if (!canvasRef.value) {
        return;
      }

      editor = init({
        view: canvasRef.value,
        autoResize: true
      });
      zoom.value = editor.state.zoom;
    };

    /**
     * 销毁 Leafer 画布。
     *
     * 组件卸载时释放 Leafer 实例和 ResizeObserver，避免重复挂载造成内存占用。
     */
    const destroyCanvas = () => {
      editor?.destroy();
      editor = null;
    };

    const openImagePicker = () => {
      imageInputRef.value?.click();
    };

    const handleImageChange = async (event) => {
      const [file] = event.target.files ?? [];

      if (!file || !editor) {
        return;
      }

      await editor.image.add(file);
      event.target.value = '';
    };

    const syncZoom = () => {
      if (!editor) {
        return;
      }

      zoom.value = editor.state.zoom;
    };

    const zoomIn = () => {
      editor?.zoomIn();
      syncZoom();
    };

    const zoomOut = () => {
      editor?.zoomOut();
      syncZoom();
    };

    const resetZoom = () => {
      editor?.resetZoom();
      syncZoom();
    };

    onMounted(initCanvas);
    onBeforeUnmount(destroyCanvas);

    return {
      canvasRef,
      imageInputRef,
      zoomPercent: computed(() => Math.round(zoom.value * 100)),
      openImagePicker,
      handleImageChange,
      zoomIn,
      zoomOut,
      resetZoom
    };
  }
};
</script>

<style lang="scss" scoped>
.editor-shell {
  width: 80vw;
  margin: 100px auto;
}

.container {
  width: 100%;
  height: 80vh;
  overflow: hidden;
  position: relative;
  border: 1px solid #e1e5eb;
}

.canvas-view {
  width: 100%;
  height: 100%;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 0;
  background: transparent;
  border: 1px solid #dbe1e8;
  border-width: 0 0 1px;
  border-radius: 6px;
}

.image-input {
  display: none;
}

.toolbar-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #cfd7e2;
  border-radius: 4px;
  background: #ffffff;
  color: #1f2937;
  font-size: 13px;
  cursor: pointer;
}

.toolbar-button:hover {
  background: #f4f7fb;
}

.icon-button {
  width: 32px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
}

.zoom-value {
  min-width: 44px;
  font-size: 13px;
  color: #364152;
  text-align: center;
}
</style>
