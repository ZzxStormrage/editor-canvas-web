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
      <input
        v-model.number="letterSpacing"
        class="number-input"
        type="number"
        min="0"
        max="120"
        step="1"
        title="字间距"
      />
      <input v-model.number="lineHeight" class="number-input" type="number" min="8" max="300" step="1" title="行间距" />
      <label class="toolbar-check">
        <input v-model="italic" type="checkbox" />
        <span>斜体</span>
      </label>
      <label class="toolbar-check">
        <input v-model="underline" type="checkbox" />
        <span>下划线</span>
      </label>
      <label class="toolbar-check">
        <input v-model="lineThrough" type="checkbox" />
        <span>删除线</span>
      </label>
      <select v-model="writingMode" class="toolbar-select mode-select">
        <option value="x">横版</option>
        <option value="y">竖版</option>
      </select>
      <button type="button" class="toolbar-button" @click="addText">添加文本</button>
      <input v-model="watermarkValue" class="text-input watermark-input" type="text" placeholder="输入水印文字" />
      <button type="button" class="toolbar-button" @click="addWatermark">添加水印</button>
      <button type="button" class="toolbar-button icon-button" @click="zoomOut">-</button>
      <span class="zoom-value">{{ zoomPercent }}%</span>
      <button type="button" class="toolbar-button icon-button" @click="zoomIn">+</button>
      <button type="button" class="toolbar-button" @click="resetZoom">重置</button>
    </div>
    <div class="container">
      <div ref="canvasRef" class="canvas-view" @dblclick.capture.stop="editSelectedText"></div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init } from './canvas-editor-core/src/index'

export default {
  setup() {
    const canvasRef = ref(null)
    const imageInputRef = ref(null)
    const zoom = ref(1)
    const textValue = ref('双击编辑文字')
    const watermarkValue = ref('')
    const fontFamily = ref('PingFang SC')
    const fontSize = ref(36)
    const fontWeight = ref('400')
    const textColor = ref('#1f2937')
    const textAlign = ref('center')
    const letterSpacing = ref(0)
    const lineHeight = ref(44)
    const italic = ref(false)
    const underline = ref(false)
    const lineThrough = ref(false)
    const writingMode = ref('x')
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
    let unsubscribeTextSelected = null
    let isSyncingTextControls = false
    let isAddingWatermark = false

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
      unsubscribeTextSelected = editor.eventBus.on('text:selected', ({ options }) => {
        if (isAddingWatermark) {
          return
        }

        applyTextOptionsToUI(options)
      })
      zoom.value = editor.state.zoom
    }

    /**
     * 销毁 Leafer 画布。
     *
     * 组件卸载时释放 Leafer 实例和 ResizeObserver，避免重复挂载造成内存占用。
     */
    const destroyCanvas = () => {
      unsubscribeTextSelected?.()
      unsubscribeTextSelected = null
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
      italic: italic.value,
      fill: textColor.value,
      textAlign: textAlign.value,
      textDecoration: getTextDecoration(),
      letterSpacing: letterSpacing.value,
      lineHeight: lineHeight.value,
      writingMode: writingMode.value
    })

    const getTextDecoration = () => {
      if (underline.value && lineThrough.value) {
        return 'under-delete'
      }

      if (underline.value) {
        return 'under'
      }

      return lineThrough.value ? 'delete' : 'none'
    }

    const applyTextOptionsToUI = async (options) => {
      if (!options) {
        return
      }

      isSyncingTextControls = true
      textValue.value = options.text ?? ''
      fontFamily.value = options.fontFamily ?? fontFamily.value
      fontSize.value = options.fontSize ?? fontSize.value
      fontWeight.value = normalizeFontWeightForUI(options.fontWeight ?? fontWeight.value)
      textColor.value = typeof options.fill === 'string' ? options.fill : textColor.value
      textAlign.value = options.textAlign ?? textAlign.value
      letterSpacing.value = options.letterSpacing ?? 0
      lineHeight.value = options.lineHeight ?? Math.round((options.fontSize ?? fontSize.value) * 1.22)
      italic.value = Boolean(options.italic)
      underline.value = options.textDecoration === 'under' || options.textDecoration === 'under-delete'
      lineThrough.value = options.textDecoration === 'delete' || options.textDecoration === 'under-delete'
      writingMode.value = options.writingMode ?? 'x'

      await nextTick()
      isSyncingTextControls = false
    }

    const normalizeFontWeightForUI = (value) => {
      const weightMap = {
        normal: '400',
        regular: '400',
        medium: '500',
        bold: '700'
      }

      return weightMap[value] ?? String(value ?? '400')
    }

    const addText = async () => {
      if (!editor) {
        return
      }

      await editor.text.add(textValue.value || '双击编辑文字', getTextOptions())
    }

    const addWatermark = async () => {
      if (!editor) {
        return
      }

      const content = watermarkValue.value?.trim() || '水印'
      const canvasWidth = editor.state.width
      const canvasHeight = editor.state.height
      const watermarkFontSize = 28
      const watermarkWidth = Math.max(180, Math.min(360, content.length * watermarkFontSize * 1.4))
      const columnGap = watermarkWidth + 110
      const rowGap = 150
      const startX = -watermarkWidth
      const startY = -rowGap
      const tasks = []

      isAddingWatermark = true

      try {
        for (let y = startY, rowIndex = 0; y < canvasHeight + rowGap; y += rowGap, rowIndex += 1) {
          const offsetX = rowIndex % 2 === 0 ? 0 : columnGap / 2

          for (let x = startX - offsetX; x < canvasWidth + columnGap; x += columnGap) {
            tasks.push(
              editor.text.add(content, {
                x,
                y,
                width: watermarkWidth,
                rotation: -28,
                fontFamily: fontFamily.value,
                fontSize: watermarkFontSize,
                fontWeight: 700,
                fill: 'rgba(255, 255, 255, 0.36)',
                textAlign: 'center',
                lineHeight: Math.round(watermarkFontSize * 1.25),
                letterSpacing: 2,
                textDecoration: 'none',
                writingMode: 'x',
                draggable: false,
                editable: false
              })
            )
          }
        }

        await Promise.all(tasks)
        editor.deselect()
      } finally {
        isAddingWatermark = false
      }
    }

    const updateSelectedText = () => {
      if (!editor) {
        return
      }

      if (isSyncingTextControls) {
        return
      }

      if (!editor.text.getSelected()) {
        return
      }

      // 如果文本输入框被清空，删除当前选中的文本元素（仅删除该元素）
      if ((textValue.value ?? '').trim() === '') {
        const t = editor.text.getSelected()
        if (t) {
          t.remove()
          editor.deselect()
        }
        return
      }

      editor.text.update({
        text: textValue.value,
        ...getTextOptions()
      })
    }

    const editSelectedText = () => {
      editor?.text.edit()
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

    watch(
      [
        textValue,
        fontFamily,
        fontSize,
        fontWeight,
        textColor,
        textAlign,
        letterSpacing,
        lineHeight,
        italic,
        underline,
        lineThrough,
        writingMode
      ],
      updateSelectedText
    )

    return {
      canvasRef,
      imageInputRef,
      textValue,
      watermarkValue,
      fontFamily,
      fontSize,
      fontWeight,
      textColor,
      textAlign,
      letterSpacing,
      lineHeight,
      italic,
      underline,
      lineThrough,
      writingMode,
      fontOptions,
      zoomPercent: computed(() => Math.round(zoom.value * 100)),
      openImagePicker,
      handleImageChange,
      addText,
      addWatermark,
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

.watermark-input {
  width: 150px;
}

.toolbar-select {
  min-width: 112px;
  padding: 0 8px;
}

.weight-select,
.align-select,
.mode-select {
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

.toolbar-check {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid #cfd7e2;
  border-radius: 4px;
  background: #ffffff;
  color: #1f2937;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.toolbar-check input {
  margin: 0;
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
