<template>
  <Transition name="selection-layer-menu">
    <v-sheet
      v-if="menu.visible"
      class="selection-layer-menu"
      elevation="8"
      rounded="lg"
      :style="menuStyle"
      @pointerdown.stop
      @click.stop
    >
      <v-tooltip
        v-for="action in menu.actions"
        :key="action.key"
        location="right"
        :text="getActionTip(action)"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            block
            class="selection-layer-menu__item"
            :disabled="action.disabled"
            :prepend-icon="getActionIcon(action.key)"
            variant="text"
            @click="handleActionClick(action)"
          >
            <span>{{ action.label }}</span>
            <span class="selection-layer-menu__shortcut">{{ action.shortcut }}</span>
          </v-btn>
        </template>
      </v-tooltip>
    </v-sheet>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  menu: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['action']);

const actionIcons = {
  front: 'mdi-arrange-bring-to-front',
  forward: 'mdi-arrange-bring-forward',
  backward: 'mdi-arrange-send-backward',
  back: 'mdi-arrange-send-to-back'
};

const menuStyle = computed(() => ({
  left: `${props.menu.x}px`,
  top: `${props.menu.y}px`
}));

/**
 * 获取层级动作对应的 Material Design 图标。
 *
 * @param {string} key 层级动作 key。
 * @returns {string} Vuetify 图标名称。
 */
function getActionIcon(key) {
  return actionIcons[key] ?? 'mdi-layers-outline';
}

/**
 * 获取菜单按钮提示文案。
 *
 * @param {{ label: string, shortcut: string }} action 层级菜单项。
 * @returns {string} tooltip 文案。
 */
function getActionTip(action) {
  return `${action.label} ${action.shortcut}`;
}

/**
 * 处理层级菜单项点击。
 *
 * @param {{ key: string, disabled: boolean }} action 层级菜单项。
 * @returns {void}
 */
function handleActionClick(action) {
  if (action.disabled) {
    return;
  }

  emit('action', action.key);
}
</script>
