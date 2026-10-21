<template>
  <div class="image-ai-subject-binding">
    <label class="layer-attribute-field">
      <span>绑定 AI 主题</span>
      <v-combobox
        :model-value="modelValue"
        aria-label="绑定 AI 主题"
        class="editor-attribute-control"
        :items="subjectOptions"
        item-title="label"
        item-value="value"
        chips
        closable-chips
        clearable
        density="compact"
        hide-details="auto"
        multiple
        :loading="loading"
        no-data-text="暂无匹配主题"
        placeholder="搜索主题名称或 ID"
        variant="outlined"
        @keydown.enter.stop
        @update:menu="handleMenuChange"
        @update:search="handleSearchChange"
        @update:model-value="handleSubjectChange"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps" class="image-ai-subject-binding__option">
            <template #prepend>
              <span class="image-ai-subject-binding__cover">
                <img
                  v-if="item.raw.previewImgUrl && !failedCoverIds.has(String(item.raw.value))"
                  :src="item.raw.previewImgUrl"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  @error="markCoverFailed(item.raw.value)"
                />
                <v-icon v-else icon="mdi-image-outline" size="16" aria-hidden="true" />
              </span>
            </template>
            <v-list-item-title>{{ item.raw.label }}</v-list-item-title>
          </v-list-item>
        </template>
        <template #append-item>
          <v-list-item
            v-if="hasMore"
            class="image-ai-subject-binding__more"
            :disabled="loading"
            @click.stop="loadNextPage"
          >
            <template #prepend>
              <v-progress-circular v-if="loading" indeterminate size="16" width="2" />
              <v-icon v-else icon="mdi-chevron-down" size="18" />
            </template>
            <v-list-item-title>{{ loading ? '加载中…' : '加载更多主题' }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-combobox>
    </label>
    <p v-if="error" class="image-ai-subject-binding__error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { XIAOXIANG_ASSET_BASE_URL } from '../../../api/clients/xiaoxiang-client.js'
import { customAiSubjectApi } from '../../../api/modules/custom-ai-subject.js'
import { normalizeAiSubjectIds } from '../../../composables/canvas-editor/image-ai-subject-binding.js'

const props = defineProps({
  editor: { type: Object, required: true },
  modelValue: { type: Array, default: () => [] },
  savedNames: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])
const subjects = ref([])
const loading = ref(false)
const error = ref('')
const hasMore = ref(true)
const search = ref('')
const failedCoverIds = ref(new Set())
let requestVersion = 0
let searchTimer = null

const subjectOptions = computed(() => {
  const selected = props.modelValue.map((id, index) => {
    const subject = subjects.value.find((item) => String(item.id) === String(id))
    return {
      label: subject?.subjectName || props.savedNames[index] || `主题 #${id}`,
      value: id,
      previewImgUrl: subject?.previewImgUrl || ''
    }
  })
  const loaded = subjects.value.map((subject) => ({
    label: `${subject.subjectName || `主题 #${subject.id}`}（${subject.id}）`,
    value: subject.id,
    previewImgUrl: subject.previewImgUrl
  }))
  const seen = new Set()
  return [...selected, ...loaded].filter((item) => {
    const key = String(item.value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

onMounted(() => {
  void loadSubjects(1, search.value, true)
})

function handleSubjectChange(value) {
  const ids = normalizeAiSubjectIds((Array.isArray(value) ? value : [value]).map((item) => {
    if (item && typeof item === 'object') return item.value ?? item.id
    return item
  }))
  emit('update:modelValue', ids)
}

function markCoverFailed(id) {
  failedCoverIds.value = new Set([...failedCoverIds.value, String(id)])
}

function handleMenuChange(open) {
  if (open && subjects.value.length === 0) {
    void loadSubjects(1, search.value, true)
  }
}

function loadNextPage() {
  void loadSubjects(subjects.value.length ? currentPage + 1 : 1, search.value, false)
}

function handleSearchChange(value) {
  const nextSearch = String(value ?? '').trim()
  if (nextSearch === search.value) return
  search.value = nextSearch
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadSubjects(1, search.value, true)
  }, 250)
}

async function loadSubjects(page, keyword, replace) {
  if ((loading.value && !replace) || (!replace && !hasMore.value)) return
  const currentVersion = ++requestVersion
  loading.value = true
  error.value = ''
  try {
    const response = await customAiSubjectApi.list({ page, size: 10, keyword })
    if (currentVersion !== requestVersion) return
      const result = normalizeSubjectPage(response, page)
    subjects.value = replace ? result.items : mergeSubjects(subjects.value, result.items)
    props.editor?.setAiSubjects?.(subjects.value)
    currentPage = replace ? 1 : page
    hasMore.value = result.hasMore
  } catch (requestError) {
    if (currentVersion === requestVersion) error.value = requestError.message || 'AI 主题加载失败。'
  } finally {
    if (currentVersion === requestVersion) loading.value = false
  }
}

let currentPage = 0

function normalizeSubjectPage(response, page) {
  const payload = response?.data?.data && typeof response.data.data === 'object'
    ? response.data.data
    : response?.data && typeof response.data === 'object'
      ? response.data
      : response
  const rawItems = Array.isArray(payload) ? payload : payload?.content ?? payload?.records ?? payload?.list ?? []
  const items = rawItems.map((item) => {
    const source = item && typeof item === 'object' ? item : {}
    const details = [
      source,
      parseObject(source.configDetail),
      parseObject(source.config_detail),
      parseObject(source.config),
      parseObject(source.detail)
    ].filter(Boolean)
    const previewImgUrl = details
      .map(findSubjectCover)
      .find(Boolean) ?? ''

    return {
      ...source,
      id: source.id ?? source.subjectId ?? source.subject_id,
      subjectName: source.subjectName ?? source.subject_name ?? source.name ?? '',
      previewImgUrl: normalizeImageUrl(previewImgUrl)
    }
  }).filter((item) => item.id !== undefined && item.id !== null)
  const total = Number(payload?.totalElements ?? payload?.total ?? 0)
  return {
    items,
    hasMore: typeof payload?.last === 'boolean'
      ? !payload.last
      : total
        ? page * 10 < total
        : items.length >= 10
  }
}

function normalizeImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    return new URL(value.trim(), `${XIAOXIANG_ASSET_BASE_URL.replace(/\/$/, '')}/`).toString()
  } catch {
    return value.trim()
  }
}

function findSubjectCover(source) {
  const coverKeys = [
    'previewImgUrl', 'preview_img_url', 'coverImgUrl', 'cover_img_url',
    'coverImageUrl', 'cover_image_url', 'coverUrl', 'cover_url',
    'thumbnailUrl', 'thumbnail_url', 'subjectImage', 'subject_image',
    'subjectImg', 'subject_img', 'pictureUrl', 'picture_url', 'picUrl', 'pic_url',
    'fileUrl', 'file_url', 'imageUrl', 'image_url', 'imgUrl', 'img_url',
    'coverImage', 'cover_image', 'thumbnail', 'image', 'cover'
  ]
  for (const key of coverKeys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
    if (value && typeof value === 'object') {
      const nestedUrl = value.url ?? value.imageUrl ?? value.imgUrl
      if (typeof nestedUrl === 'string' && nestedUrl.trim()) return nestedUrl
    }
  }
  return ''
}

function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function mergeSubjects(current, incoming) {
  const result = [...current]
  const seen = new Set(result.map((item) => String(item.id)))
  incoming.forEach((item) => {
    if (!seen.has(String(item.id))) {
      seen.add(String(item.id))
      result.push(item)
    }
  })
  return result
}

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  requestVersion += 1
})
</script>

<style scoped>
.image-ai-subject-binding {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-ai-subject-binding__error {
  margin: 0;
  color: rgb(var(--v-theme-error));
  font-size: 10px;
}

.image-ai-subject-binding__more {
  width: 100%;
  min-height: 40px;
  margin: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  padding: 8px 16px;
  text-align: left;
}

.image-ai-subject-binding__more:hover:not(.v-list-item--disabled) {
  background: rgba(var(--v-theme-primary), 0.06);
}

.image-ai-subject-binding__more:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.image-ai-subject-binding__cover {
  display: grid;
  width: 32px;
  height: 32px;
  overflow: hidden;
  place-items: center;
  border-radius: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.image-ai-subject-binding__cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-ai-subject-binding__more:disabled {
  cursor: wait;
  opacity: 0.6;
}
</style>
