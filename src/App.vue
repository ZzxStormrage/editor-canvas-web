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
      <input v-model="textValue" class="text-input" type="text" placeholder="输入文本" />
      <select v-model="fontFamily" class="toolbar-select">
        <option v-for="font in fontOptions" :key="font" :value="font">{{ font }}</option>
      </select>
      <input v-model.number="fontSize" class="number-input" type="number" min="8" max="240" step="1" />
      <select v-model="fontWeight" class="toolbar-select weight-select">
        <option value="400">常规</option>
        <option value="500">中等</option>
        <option value="700">加粗</option>
      </select>
      <input v-model="textColor" class="color-input" type="color" aria-label="文字颜色" />
      <select v-model="textAlign" class="toolbar-select align-select">
        <option value="left">左对齐</option>
        <option value="center">居中</option>
        <option value="right">右对齐</option>
      </select>
      <button type="button" class="toolbar-button" @click="addText">添加文本</button>
      <button type="button" class="toolbar-button icon-button" @click="zoomOut">-</button>
      <span class="zoom-value">{{ zoomPercent }}%</span>
      <button type="button" class="toolbar-button icon-button" @click="zoomIn">+</button>
      <button type="button" class="toolbar-button" @click="resetZoom">重置</button>
    </div>
    <div class="container">
      <div ref="canvasRef" class="canvas-view" @dblclick.capture="editSelectedText"></div>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init } from './canvas-editor-core/src/index'

export default {
  setup() {
    const canvasRef = ref(null)
    const imageInputRef = ref(null)
    const zoom = ref(1)
    const textValue = ref('双击编辑文字')
    const fontFamily = ref('PingFang SC')
    const fontSize = ref(36)
    const fontWeight = ref('400')
    const textColor = ref('#1f2937')
    const textAlign = ref('left')
    const fontOptions = [
      'PingFang SC',
      'Microsoft YaHei',
      'Arial',
      'Helvetica',
      'Georgia',
      'Times New Roman',
      'Courier New'
    ]
    let editor = null

    /**
     * 初始化 Leafer 画布。
     *
     * 等 DOM 挂载完成后，把 canvasRef 对应的容器传给 canvas-editor-core 的 init 方法。
     */
    const initCanvas = () => {
      if (!canvasRef.value) {
        return
      }

      editor = init({
        view: canvasRef.value,
        autoResize: true
      })
      zoom.value = editor.state.zoom
    }

    /**
     * 销毁 Leafer 画布。
     *
     * 组件卸载时释放 Leafer 实例和 ResizeObserver，避免重复挂载造成内存占用。
     */
    const destroyCanvas = () => {
      editor?.destroy()
      editor = null
    }

    const openImagePicker = () => {
      imageInputRef.value?.click()
    }

    const handleImageChange = async (event) => {
      const [file] = event.target.files ?? []

      if (!file || !editor) {
        return
      }

      await editor.image.add(file)
      event.target.value = ''
    }

    const getTextOptions = () => ({
      fontFamily: fontFamily.value,
      fontSize: fontSize.value,
      fontWeight: Number(fontWeight.value),
      fill: textColor.value,
      textAlign: textAlign.value,
      lineHeight: Math.round(fontSize.value * 1.22)
    })

    const syncEditingDomStyle = () => {
      const editDom = document.querySelector('.leafer-text-editor')

      if (!(editDom instanceof HTMLElement)) {
        return
      }

      const { style } = editDom
      style.fontFamily = fontFamily.value.includes(' ') ? `"${fontFamily.value}"` : fontFamily.value
      style.fontSize = `${fontSize.value}px`
      style.fontWeight = fontWeight.value
      style.color = textColor.value
      style.textAlign = textAlign.value
      style.display = 'flex'
      style.flexDirection = 'column'
      style.justifyContent = 'flex-start'
      style.lineHeight = `${Math.round(fontSize.value * 1.22)}px`
      style.whiteSpace = 'normal'
      style.wordBreak = 'normal'
    }

    const syncEditingDomStyleLater = () => {
      requestAnimationFrame(syncEditingDomStyle)
      requestAnimationFrame(() => requestAnimationFrame(syncEditingDomStyle))
      setTimeout(syncEditingDomStyle, 80)
    }

    const addText = async () => {
      if (!editor) {
        return
      }

      await editor.text.add(textValue.value || '双击编辑文字', getTextOptions())
    }

    const updateSelectedText = () => {
      if (!editor) {
        return
      }

      if (!editor.text.getSelected()) {
        return
      }

      editor.text.update({
        text: textValue.value,
        ...getTextOptions()
      })
      syncEditingDomStyleLater()
    }

    const editSelectedText = () => {
      editor?.text.edit()
      syncEditingDomStyleLater()
    }

    const syncZoom = () => {
      if (!editor) {
        return
      }

      zoom.value = editor.state.zoom
    }

    const zoomIn = () => {
      editor?.zoomIn()
      syncZoom()
    }

    const zoomOut = () => {
      editor?.zoomOut()
      syncZoom()
    }

    const resetZoom = () => {
      editor?.resetZoom()
      syncZoom()
    }

    onMounted(initCanvas)
    onBeforeUnmount(destroyCanvas)

    watch([textValue, fontFamily, fontSize, fontWeight, textColor, textAlign], updateSelectedText)

    return {
      canvasRef,
      imageInputRef,
      textValue,
      fontFamily,
      fontSize,
      fontWeight,
      textColor,
      textAlign,
      fontOptions,
      zoomPercent: computed(() => Math.round(zoom.value * 100)),
      openImagePicker,
      handleImageChange,
      addText,
      editSelectedText,
      zoomIn,
      zoomOut,
      resetZoom
    }
  }
}
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
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 0;
  background: transparent;
  border: 1px solid #dbe1e8;
  border-width: 0 0 1px;
  border-radius: 6px;
}

.text-input,
.toolbar-select,
.number-input,
.color-input {
  height: 32px;
  border: 1px solid #cfd7e2;
  border-radius: 4px;
  background: #ffffff;
  color: #1f2937;
  font-size: 13px;
}

.text-input {
  width: 180px;
  padding: 0 10px;
}

.toolbar-select {
  min-width: 112px;
  padding: 0 8px;
}

.weight-select,
.align-select {
  min-width: 82px;
}

.number-input {
  width: 64px;
  padding: 0 8px;
}

.color-input {
  width: 40px;
  padding: 3px;
  cursor: pointer;
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
