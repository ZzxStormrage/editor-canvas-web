<template>
  <v-app class="editor-app">
    <EditorTopBar
      :disabled="templateLoading || !editor.ready.value"
      :saving="saving"
      :status="templateStatus"
      @save="saveCustomTemplate"
    />

    <div class="editor-workbench">
      <EditorRail v-model="activePanel" />
      <EditorSidePanel :active-panel="activePanel" :editor="editor" />
      <CanvasWorkspace :editor="editor" />
      <v-overlay class="align-center justify-center" contained persistent :model-value="templateLoading">
        <v-progress-circular color="primary" indeterminate size="32" width="3" />
      </v-overlay>
    </div>

    <v-snackbar v-model="message.visible" :color="message.color" location="top center" timeout="2600">
      {{ message.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CanvasWorkspace from '../components/editor-shell/CanvasWorkspace.vue'
import EditorRail from '../components/editor-shell/EditorRail.vue'
import EditorSidePanel from '../components/editor-shell/EditorSidePanel.vue'
import EditorTopBar from '../components/editor-shell/EditorTopBar.vue'
import { useCanvasEditor } from '../composables/useCanvasEditor.js'
import { useCustomTemplatePersistence } from '../composables/useCustomTemplatePersistence.js'
import { subscribeAuthExpired } from '../services/auth-token.js'
import '../assets/scss/editor-workbench.scss'

const route = useRoute()
const router = useRouter()
const activePanel = ref('text')
const message = reactive({ visible: false, text: '', color: 'error' })
const editor = useCanvasEditor({
  onMessage: showMessage,
  onOpenLayerAttributes: openLayerAttributesPanel
})
const templatePersistence = useCustomTemplatePersistence({
  editor,
  route,
  router,
  onMessage: showMessage
})
const saving = templatePersistence.saving
const templateLoading = templatePersistence.loading
const templateStatus = templatePersistence.statusText
const removeAuthExpiredSubscription = subscribeAuthExpired((error) => {
  showMessage(error?.message || '登录已过期，请重新登录。', 'error')
})

onBeforeUnmount(removeAuthExpiredSubscription)

/** @returns {void} 切换到图层面板以响应选区属性请求。 */
function openLayerAttributesPanel() {
  activePanel.value = 'layers'
}

/** @returns {Promise<void>} 创建或更新当前自定义模板。 */
async function saveCustomTemplate() {
  try {
    const result = await templatePersistence.save()

    if (result) {
      showMessage(result.created ? '模板已创建' : '模板已保存', 'success')
    }
  } catch (error) {
    showMessage(error.message || '模板保存失败。', 'error')
  }
}

/**
 * @param {string} text 提示内容。
 * @param {'success' | 'error'} color 提示颜色。
 * @returns {void}
 */
function showMessage(text, color) {
  message.text = text
  message.color = color
  message.visible = true
}
</script>
