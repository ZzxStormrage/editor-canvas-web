<template>
  <input
    :ref="setImageReplacementInputRef"
    class="side-file-input"
    type="file"
    accept="image/*"
    :disabled="editor.imageReplacing.value"
    @change="editor.handleSelectedImageReplacementChange"
  />
  <Transition name="selection-toolbar">
    <div
      v-if="toolbar.visible"
      class="selection-action-toolbar"
      role="toolbar"
      aria-label="元素操作"
      :style="toolbarStyle"
      @pointerdown.stop
      @click.stop
    >
      <v-tooltip
        v-for="action in actions"
        :key="action.key"
        :text="action.label"
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            :aria-label="action.label"
            :aria-busy="action.loading"
            :class="['selection-action-toolbar__button', `is-${action.key}`]"
            :disabled="action.disabled"
            :loading="action.loading"
            icon
            size="small"
            variant="text"
            @click="handleAction(action.key, $event)"
          >
            <v-icon :icon="action.icon" :size="action.iconSize" />
          </v-btn>
        </template>
      </v-tooltip>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  toolbar: {
    type: Object,
    required: true
  },
  editor: {
    type: Object,
    required: true
  }
});

const actions = computed(() => {
  const items = [
    {
      key: 'lock',
      label: props.toolbar.locked ? '解锁' : '锁定',
      icon: props.toolbar.locked ? 'mdi-lock-open-variant-outline' : 'mdi-lock-outline',
      iconSize: 20,
      disabled: false
    },
    {
      key: 'duplicate',
      label: '复制',
      icon: 'mdi-content-copy',
      iconSize: 18,
      disabled: props.toolbar.disabled?.duplicate
    }
  ];

  if (props.toolbar.isImageSelection) {
    items.push({
      key: 'replace',
      label: '替换',
      icon: 'mdi-image-sync-outline',
      iconSize: 19,
      disabled: props.toolbar.disabled?.replace || props.editor.imageReplacing.value,
      loading: props.editor.imageReplacing.value
    });
  }

  if (props.toolbar.canEditAttributes) {
    items.push({
      key: 'attributes',
      label: '属性',
      icon: 'mdi-tune-variant',
      iconSize: 18,
      disabled: props.toolbar.disabled?.attributes
    });
  }

  if (props.toolbar.selectionCount > 1) {
    items.push({
      key: 'group',
      label: '组合',
      icon: 'mdi-group',
      iconSize: 19,
      disabled: props.toolbar.disabled?.group
    });
  } else if (props.toolbar.canUngroup) {
    items.push({
      key: 'ungroup',
      label: '解组',
      icon: 'mdi-ungroup',
      iconSize: 19,
      disabled: props.toolbar.disabled?.ungroup
    });
  }

  items.push(
    {
      key: 'delete',
      label: '删除',
      icon: 'mdi-delete-outline',
      iconSize: 19,
      disabled: props.toolbar.disabled?.delete
    },
    {
      key: 'layer',
      label: '图层',
      icon: 'mdi-layers-outline',
      iconSize: 19,
      disabled: props.toolbar.disabled?.layer
    }
  );

  return items;
});

const toolbarStyle = computed(() => ({
  '--selection-toolbar-x': `${props.toolbar.x}px`,
  '--selection-toolbar-y': `${props.toolbar.y}px`,
  '--selection-toolbar-width': `${props.toolbar.width}px`
}));

/**
 * 将工具条命令委托给应用层编辑器 API。
 *
 * @param {'lock' | 'duplicate' | 'replace' | 'attributes' | 'group' | 'ungroup' | 'delete' | 'layer'} action
 * 选区动作。
 * @param {MouseEvent} event 按钮点击事件。
 * @returns {void}
 */
function handleAction(action, event) {
  if (action === 'lock') {
    props.editor.toggleSelectionLock();
  } else if (action === 'duplicate') {
    props.editor.duplicateSelection();
  } else if (action === 'replace') {
    props.editor.openSelectedImageReplacementPicker();
  } else if (action === 'attributes') {
    props.editor.openSelectedElementAttributes();
  } else if (action === 'delete') {
    props.editor.deleteSelection();
  } else if (action === 'group') {
    props.editor.groupSelection();
  } else if (action === 'ungroup') {
    props.editor.ungroupSelection();
  } else if (action === 'layer') {
    props.editor.toggleSelectionLayerMenu(event.currentTarget);
  }
}

/**
 * 将图片替换 input 的 DOM 引用交给应用层上传逻辑。
 *
 * @param {HTMLInputElement | null} element 文件选择 input。
 * @returns {void}
 */
function setImageReplacementInputRef(element) {
  if (props.editor?.imageReplacementInputRef) {
    props.editor.imageReplacementInputRef.value = element;
  }
}
</script>
