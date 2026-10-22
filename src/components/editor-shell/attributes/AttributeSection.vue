<template>
  <section class="attribute-section" :class="{ 'attribute-section--expanded': expanded }">
    <button
      type="button"
      class="attribute-section__trigger"
      :aria-controls="contentId"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="attribute-section__summary">
        <strong>{{ title }}</strong>
        <small>{{ subtitle }}</small>
      </span>
      <span class="attribute-section__icon" aria-hidden="true">
        <v-icon :icon="expanded ? 'mdi-minus' : 'mdi-plus'" size="17" />
      </span>
    </button>

    <Transition name="attribute-section-content">
      <div v-if="expanded" :id="contentId" class="attribute-section__content">
        <slot></slot>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { ref } from 'vue';

let sectionSequence = 0;

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  defaultOpen: { type: Boolean, default: false }
});

const expanded = ref(props.defaultOpen);
const contentId = `attribute-section-${++sectionSequence}`;
</script>

<style scoped>
.attribute-section {
  box-sizing: border-box;
  width: 100%;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-outline), 0.16);
  border-radius: var(--editor-radius-card, 8px);
  background: rgb(var(--v-theme-surface));
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.attribute-section--expanded {
  border-color: rgba(var(--v-theme-primary), 0.24);
  box-shadow: 0 1px 6px rgba(var(--v-theme-shadow), 0.06);
}

.attribute-section__trigger {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px 7px 10px;
  border: 0;
  color: var(--editor-text);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 150ms ease;
}

.attribute-section__trigger:hover,
.attribute-section__trigger:focus-visible {
  background: rgba(var(--v-theme-primary), 0.055);
  outline: none;
}

.attribute-section__trigger:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(var(--v-theme-primary), 0.18);
}

.attribute-section__summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.attribute-section__summary strong {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}

.attribute-section__summary small {
  overflow: hidden;
  color: var(--editor-muted);
  font-size: var(--editor-font-micro);
  font-weight: 550;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attribute-section__icon {
  display: inline-grid;
  place-items: center;
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  border-radius: var(--editor-radius-field, 6px);
  color: var(--editor-primary);
  background: rgba(var(--v-theme-primary), 0.1);
}

.attribute-section__content {
  padding: 10px;
  border-top: 1px solid rgba(var(--v-theme-outline), 0.1);
}

.attribute-section-content-enter-active,
.attribute-section-content-leave-active {
  overflow: hidden;
  transition:
    max-height 210ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease,
    padding 210ms ease;
}

.attribute-section-content-enter-from,
.attribute-section-content-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}

.attribute-section-content-enter-to,
.attribute-section-content-leave-from {
  max-height: 720px;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .attribute-section,
  .attribute-section__trigger,
  .attribute-section-content-enter-active,
  .attribute-section-content-leave-active {
    transition: none;
  }
}
</style>
