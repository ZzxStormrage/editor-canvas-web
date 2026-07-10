<template>
  <v-sheet class="panel-group" color="surface" rounded="md">
    <div v-if="title || slots.aside" class="panel-group-header">
      <h3 v-if="title">{{ title }}</h3>
      <slot name="aside"></slot>
    </div>

    <div class="panel-group-body">
      <slot></slot>
    </div>
  </v-sheet>
</template>

<script setup>
import { useSlots } from 'vue';

const slots = useSlots();

/**
 * 统一侧边栏功能区块容器。
 * 标题只在必要时展示，常规工具区块保持轻量的无标题分组。
 */
defineProps({
  title: {
    type: String,
    default: ''
  }
});
</script>
