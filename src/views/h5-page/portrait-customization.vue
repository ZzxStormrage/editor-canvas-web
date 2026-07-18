<template>
  <PoetryCustomizationPage
    page-title="人像款定制"
    page-id="portrait-customization"
    default-design-name="人像款定制"
    copy-heading="编辑人像文案"
    replacement-text-label="定制文案"
    title-text-label="人像标题"
    :image-target-descriptions="portraitImageDescriptions"
  />
</template>

<script setup>
import PoetryCustomizationPage from './poetry-customization.vue'

const portraitImageDescriptions = Object.freeze([
  '人像替换',
  '人像定制',
  'AI主题',
  '原图替换',
  '原图定制'
])
</script>
