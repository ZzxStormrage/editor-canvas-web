<template>
  <div class="image-replacement-binding">
    <label class="layer-attribute-field">
      <span>联动替换组</span>
      <v-autocomplete
        :model-value="modelValue"
        :items="options"
        item-title="name"
        item-value="id"
        class="editor-attribute-control"
        aria-label="联动替换组"
        placeholder="不联动（单独替换）"
        clearable
        density="compact"
        hide-details
        variant="outlined"
        no-data-text="暂无匹配组，可在下方新建"
        @update:model-value="selectGroup"
      />
    </label>
    <v-btn
      v-if="!creating"
      class="layer-attribute-footer-button image-replacement-binding__create"
      color="primary"
      size="small"
      variant="text"
      prepend-icon="mdi-plus"
      @click="creating = true"
    >
      新建联动组
    </v-btn>
    <div v-else class="image-replacement-binding__new">
      <v-text-field
        v-model="newName"
        autofocus
        aria-label="新联动组名称"
        placeholder="例如：杯子正反面"
        maxlength="40"
        density="compact"
        hide-details
        class="editor-attribute-control"
        variant="outlined"
        @keydown.enter.stop.prevent="createGroup"
      />
      <v-btn class="layer-attribute-footer-button" size="small" variant="text" @click="creating = false">取消</v-btn>
      <v-btn
        class="layer-attribute-footer-button"
        color="primary"
        size="small"
        variant="text"
        :disabled="!newName.trim()"
        @click="createGroup"
      >
        创建
      </v-btn>
    </div>
    <p v-if="selectedGroup" class="layer-attribute-help">
      同组图片会在 H5 同步替换，各自保留位置、尺寸和适配方式。
    </p>
    <ul v-if="members.length" class="image-replacement-binding__members" aria-label="联动组成员">
      <li v-for="(member, index) in members" :key="`${member.canvasId}:${member.elementId}:${index}`">
        <v-icon icon="mdi-link-variant" size="14" />
        <span>{{ member.canvasName }} · {{ member.name }}</span>
      </li>
    </ul>
    <p v-else-if="selectedGroup" class="layer-attribute-help">保存配置后，其他图片即可加入此组。</p>
    <p v-else class="layer-attribute-help">每张图片最多加入一个组；清除选择即可退出。</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { nanoid } from 'nanoid'
import { collectReplacementGroups } from '../../../services/image-replacement-groups.js'

const props = defineProps({
  editor: { type: Object, required: true },
  modelValue: { type: String, default: '' },
  groupName: { type: String, default: '' },
  elementId: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue', 'update:groupName'])
const creating = ref(false)
const newName = ref('')
const draftGroups = ref([])
const groups = computed(() => {
  // 图层 DTO 更新时重新读取当前文档及其他部件快照。
  void props.editor.layers.value
  return collectReplacementGroups(props.editor.getCustomizationDocument?.() ?? props.editor.exportDocument())
})
const options = computed(() => {
  const items = [...groups.value, ...draftGroups.value]
  if (props.modelValue && !items.some((group) => group.id === props.modelValue)) {
    items.push({ id: props.modelValue, name: props.groupName || '未命名联动组', members: [] })
  }
  return [...new Map(items.map((group) => [group.id, group])).values()]
})
const selectedGroup = computed(() => options.value.find((group) => group.id === props.modelValue))
const members = computed(() => (selectedGroup.value?.members ?? []).filter((member) => {
  return member.elementId !== props.elementId || member.canvasId !== props.editor.activeCustomizationCanvasId?.()
}))

function selectGroup(id) {
  const group = options.value.find((item) => item.id === id)
  emit('update:modelValue', group?.id || '')
  emit('update:groupName', group?.name || '')
}

function createGroup() {
  const name = newName.value.trim()
  if (!name) return
  let group = options.value.find((item) => item.name === name)
  if (!group) {
    group = { id: nanoid(), name, members: [] }
    draftGroups.value.push(group)
  }
  selectGroup(group.id)
  newName.value = ''
  creating.value = false
}
</script>

<style scoped>
.image-replacement-binding { display: flex; flex-direction: column; gap: 8px; }
.image-replacement-binding__create { align-self: flex-start; }
.image-replacement-binding__new { display: flex; flex-wrap: wrap; gap: 4px; }
.image-replacement-binding__new > .v-input { flex: 1 0 100%; }
.image-replacement-binding__members { display: flex; flex-direction: column; gap: 5px; padding: 0; margin: 0; list-style: none; font-size: 11px; }
.image-replacement-binding__members li { display: flex; align-items: center; gap: 5px; min-width: 0; }
.image-replacement-binding__members span { overflow-wrap: anywhere; }
</style>
