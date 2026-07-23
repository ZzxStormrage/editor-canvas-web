<template>
  <section class="material-group-browser" aria-label="素材组">
    <div class="material-group-browser__heading">
      <div>
        <strong>素材组</strong>
        <span v-if="editor.materialGroups.value.length">
          {{ editor.materialGroups.value.length }} 组
        </span>
      </div>
      <span v-if="editor.activeMaterialGroup.value && !editor.materialLoading.value">
        {{ editor.materialTotal.value }} 张
      </span>
    </div>

    <div
      v-if="editor.materialGroups.value.length"
      class="material-group-tabs"
      role="tablist"
      aria-label="选择素材组"
    >
      <button
        v-for="group in editor.materialGroups.value"
        :key="group.id"
        type="button"
        class="material-group-tab"
        :class="{
          'material-group-tab--active': String(group.id) === String(editor.activeMaterialGroupId.value)
        }"
        role="tab"
        :aria-selected="String(group.id) === String(editor.activeMaterialGroupId.value)"
        :title="group.groupName"
        @click="editor.selectMaterialGroup(group.id)"
      >
        {{ group.groupName }}
      </button>
    </div>

    <div
      ref="viewportRef"
      class="material-browser-viewport"
      :aria-busy="editor.materialLoading.value || editor.materialLoadingMore.value"
      @scroll.passive="handleViewportScroll"
    >
      <div v-if="editor.materialLoading.value" class="material-skeleton-grid" aria-label="素材加载中">
        <div v-for="index in 6" :key="index" class="material-skeleton-card">
          <div class="material-skeleton-card__image"></div>
          <div class="material-skeleton-card__text"></div>
        </div>
      </div>

      <div v-else-if="editor.materials.value.length" class="material-grid">
        <button
          v-for="material in editor.materials.value"
          :key="material.id"
          type="button"
          class="material-card"
          :disabled="Boolean(editor.addingMaterialId.value)"
          :aria-label="`添加素材：${material.materialName}`"
          :title="material.materialName"
          @click="editor.addMaterialToCanvas(material)"
        >
          <span class="material-card__preview">
            <img
              v-if="!failedMaterialIds.has(String(material.id))"
              :src="material.materialUrl"
              :alt="material.materialName"
              loading="lazy"
              decoding="async"
              @error="markMaterialFailed(material.id)"
            />
            <v-icon v-else icon="mdi-image-off-outline" size="26" />
            <span
              v-if="String(editor.addingMaterialId.value) === String(material.id)"
              class="material-card__loading"
            >
              <v-progress-circular color="primary" indeterminate size="22" width="2" />
            </span>
          </span>
          <span class="material-card__name">{{ material.materialName }}</span>
        </button>
      </div>

      <div
        v-else-if="editor.materialError.value"
        class="material-browser-state material-browser-state--error"
      >
        <v-icon icon="mdi-cloud-alert-outline" size="26" />
        <span>{{ editor.materialError.value }}</span>
        <v-btn size="small" variant="tonal" @click="editor.retryMaterials">重试</v-btn>
      </div>

      <div
        v-else-if="editor.activeMaterialGroup.value"
        class="material-browser-state"
      >
        <v-icon icon="mdi-image-multiple-outline" size="26" />
        <span>该素材组暂无图片</span>
      </div>

      <div v-else class="material-browser-state">
        <v-icon icon="mdi-folder-image" size="26" />
        <span>暂无素材组</span>
        <small>请由宿主在初始化消息中传入</small>
      </div>

      <div v-if="editor.materials.value.length" class="material-browser-footer">
        <template v-if="editor.materialLoadingMore.value">
          <v-progress-circular color="primary" indeterminate size="16" width="2" />
          <span>加载更多</span>
        </template>
        <template v-else-if="editor.materialError.value">
          <span>加载失败</span>
          <button type="button" @click="editor.retryMaterials">重试</button>
        </template>
        <span v-else-if="!editor.materialHasMore.value">已加载全部素材</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';

const LOAD_MORE_THRESHOLD = 120;
const viewportRef = ref(null);
const failedMaterialIds = ref(new Set());

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

watch(
  [
    () => props.editor.materialLoading.value,
    () => props.editor.materialLoadingMore.value,
    () => props.editor.materials.value.length,
    () => props.editor.materialHasMore.value,
    () => props.editor.activeMaterialGroupId.value
  ],
  () => {
    void requestMoreIfViewportIsNotFilled();
  },
  { flush: 'post' }
);

watch(
  () => props.editor.activeMaterialGroupId.value,
  () => {
    failedMaterialIds.value = new Set();
    if (viewportRef.value) {
      viewportRef.value.scrollTop = 0;
    }
  }
);

/**
 * 滚动接近底部时请求下一页。
 *
 * @param {Event} event 滚动事件。
 * @returns {void}
 */
function handleViewportScroll(event) {
  const viewport = event.currentTarget;
  if (isNearViewportBottom(viewport)) {
    void props.editor.loadMoreMaterials();
  }
}

/**
 * 首屏素材不足以产生滚动条时继续加载，直到填满可视区域或没有下一页。
 *
 * @returns {Promise<void>}
 */
async function requestMoreIfViewportIsNotFilled() {
  await nextTick();
  const viewport = viewportRef.value;

  if (
    !viewport
    || props.editor.materialLoading.value
    || props.editor.materialLoadingMore.value
    || props.editor.materialError.value
    || !props.editor.materialHasMore.value
  ) {
    return;
  }

  if (viewport.scrollHeight <= viewport.clientHeight + LOAD_MORE_THRESHOLD) {
    await props.editor.loadMoreMaterials();
  }
}

/**
 * 判断滚动容器是否接近底部。
 *
 * @param {HTMLElement} viewport 素材滚动容器。
 * @returns {boolean} 是否需要加载更多。
 */
function isNearViewportBottom(viewport) {
  return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    <= LOAD_MORE_THRESHOLD;
}

/**
 * 记录加载失败的缩略图，避免浏览器重复请求无效地址。
 *
 * @param {string | number} materialId 素材 ID。
 * @returns {void}
 */
function markMaterialFailed(materialId) {
  failedMaterialIds.value = new Set([
    ...failedMaterialIds.value,
    String(materialId)
  ]);
}
</script>
