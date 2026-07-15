<template>
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
            :class="['selection-action-toolbar__button', `is-${action.key}`]"
            :disabled="action.disabled"
            :icon="action.icon"
            size="small"
            variant="text"
            @click="handleAction(action.key, $event)"
          />
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
      disabled: false
    },
    {
      key: 'duplicate',
      label: '复制',
      icon: 'mdi-content-copy',
      disabled: props.toolbar.disabled?.duplicate
    }
  ];

  if (props.toolbar.selectionCount > 1) {
    items.push({
      key: 'group',
      label: '组合',
      icon: 'mdi-group',
      disabled: props.toolbar.disabled?.group
    });
  } else if (props.toolbar.canUngroup) {
    items.push({
      key: 'ungroup',
      label: '解组',
      icon: 'mdi-ungroup',
      disabled: props.toolbar.disabled?.ungroup
    });
  }

  items.push(
    {
      key: 'delete',
      label: '删除',
      icon: 'mdi-delete-outline',
      disabled: props.toolbar.disabled?.delete
    },
    {
      key: 'layer',
      label: '图层',
      icon: 'mdi-layers-outline',
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
 * @param {'lock' | 'duplicate' | 'group' | 'ungroup' | 'delete' | 'layer'} action 选区动作。
 * @param {MouseEvent} event 按钮点击事件。
 * @returns {void}
 */
function handleAction(action, event) {
  if (action === 'lock') {
    props.editor.toggleSelectionLock();
  } else if (action === 'duplicate') {
    props.editor.duplicateSelection();
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
</script>
