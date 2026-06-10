* @FilePath: /mb-editor/src/App.vue * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置
进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE -->
<template>
  <div class="container">
    <div ref="canvasRef" class="canvas-view"></div>
  </div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { init } from './canvas-editor-core/src/index'

export default {
  setup() {
    const canvasRef = ref(null)
    let editor = null

    /**
     * 初始化 Leafer 画布。
     *
     * 等 DOM 挂载完成后，把 canvasRef 对应的容器传给 canvas-editor-core 的 init 方法。
     */
    const initCanvas = () => {
      if (!canvasRef.value) return

      editor = init({
        view: canvasRef.value,
        background: '#ffffff',
        autoResize: true
      })
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

    onMounted(initCanvas)
    onBeforeUnmount(destroyCanvas)

    return {
      canvasRef
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.canvas-view {
  width: 100%;
  height: 100%;
}
</style>
