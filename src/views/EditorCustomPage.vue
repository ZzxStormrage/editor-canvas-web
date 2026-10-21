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
      <CanvasWorkspace :editor="editor" :production-areas="productionAreas" :components="components" />
      <EditorAttributeDrawer :editor="editor" />
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
import EditorAttributeDrawer from '../components/editor-shell/EditorAttributeDrawer.vue'
import EditorRail from '../components/editor-shell/EditorRail.vue'
import EditorSidePanel from '../components/editor-shell/EditorSidePanel.vue'
import EditorTopBar from '../components/editor-shell/EditorTopBar.vue'
import { useCanvasEditor } from '../composables/useCanvasEditor.js'
import { useProductionAreas } from '../composables/canvas-editor/useProductionAreas.js'
import { useCanvasComponents } from '../composables/canvas-editor/useCanvasComponents.js'
import { useCustomTemplatePersistence } from '../composables/useCustomTemplatePersistence.js'
import { subscribeAuthExpired } from '../services/auth-token.js'
import '../assets/scss/editor-workbench.scss'

const route = useRoute()
const router = useRouter()
const activePanel = ref('artboard')
const message = reactive({ visible: false, text: '', color: 'error' })
const editor = useCanvasEditor({
  onMessage: showMessage,
  enableProductionAreas: true,
  enableCustomization: true
})
const components = useCanvasComponents(editor, showMessage)
editor.getCustomizationDocument = components.getCustomizationDocument
editor.activeCustomizationCanvasId = () => components.activeComponentId.value
const productionAreas = useProductionAreas(editor, showMessage)
const templatePersistence = useCustomTemplatePersistence({
  editor,
  components,
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

/** @returns {Promise<void>} 将当前编辑器 JSON 提交给外部宿主。 */
async function saveCustomTemplate() {
  try {
    const result = await templatePersistence.save()

    if (result) {
      showMessage('保存数据已发送', 'success')
    }
  } catch (error) {
    showMessage(error.message || '保存数据发送失败。', 'error')
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
