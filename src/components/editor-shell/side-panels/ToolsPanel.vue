<template>
  <section class="panel-section">
    <div class="panel-heading">
      <span>工具</span>
    </div>

    <WatermarkPanel :editor="editor" />
  </section>
</template>

<script setup>
import WatermarkPanel from './WatermarkPanel.vue';

defineProps({
  editor: {
    type: Object,
    required: true
  }
});
</script>
