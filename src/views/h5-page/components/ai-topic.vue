<template>
  <section class="ai-topic-picker" :aria-busy="loading || generating">
    <header class="topic-heading">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <button v-if="loadError" type="button" class="retry-button" :disabled="loading" @click="loadTopics">重试</button>
    </header>

    <div v-if="generating" class="generating-state" role="status" aria-live="polite">
      <div class="generating-copy">
        <strong>正在 AI 生成人像</strong>
        <span>预计需要 20 秒，请耐心等待…</span>
      </div>
      <div
        class="progress-track"
        role="progressbar"
        aria-label="AI 生成进度"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <span :style="{ width: `${progress}%` }"></span>
      </div>
      <span class="progress-value">{{ progress }}%</span>
      <button type="button" class="cancel-generation" @click="cancelGeneration">取消生成</button>
    </div>

    <div v-else-if="loading" class="topic-skeletons" role="status" aria-live="polite">
      <span class="visually-hidden">AI 主题加载中…</span>
      <div v-for="index in 4" :key="index" class="topic-skeleton" aria-hidden="true">
        <span></span>
        <i></i>
      </div>
    </div>

    <div v-else-if="loadError" class="topic-empty is-error" role="alert">
      <v-icon icon="mdi-alert-circle-outline" size="26" />
      <strong>AI 主题加载失败</strong>
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="!topics.length" class="topic-empty" role="status">
      <v-icon icon="mdi-image-off-outline" size="26" />
      <strong>暂无可用 AI 主题</strong>
      <span>请确认商品已配置 AI 主题 ID。</span>
    </div>

    <div v-else-if="topics.length > 1" class="topic-grid" aria-label="AI 主题">
      <button
        v-for="topic in topics"
        :key="topic.id"
        type="button"
        class="topic-card"
        :class="{ 'is-selected': selectedTopic?.id === topic.id }"
        :disabled="disabled"
        :aria-pressed="selectedTopic?.id === topic.id"
        @click="selectTopic(topic)"
      >
        <span class="topic-image-wrap">
          <img v-if="topic.previewImgUrl" :src="topic.previewImgUrl" alt="" loading="lazy" />
          <v-icon v-else icon="mdi-image-off-outline" size="28" aria-hidden="true" />
          <span class="topic-tag">AI 生成</span>
        </span>
        <span class="topic-name">{{ topic.subjectName || '未命名主题' }}</span>
      </button>
    </div>

    <p
      v-if="operationStatus.text && !generating"
      class="operation-status"
      :class="`is-${operationStatus.type}`"
      :role="operationStatus.type === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      {{ operationStatus.text }}
    </p>

    <input
      ref="albumInputRef"
      class="file-input"
      type="file"
      :accept="IMAGE_FILE_ACCEPT"
      aria-label="从手机相册选择人像图片"
      @change="handleImageChange"
    />
    <input
      ref="cameraInputRef"
      class="file-input"
      type="file"
      :accept="IMAGE_FILE_ACCEPT"
      capture="user"
      aria-label="使用前置摄像头拍摄人像图片"
      @change="handleImageChange"
    />

    <Transition name="picker-sheet">
      <div v-if="showSourceSheet" class="source-backdrop" @click.self="closeSourceSheet">
        <section class="source-sheet" role="dialog" aria-modal="true" aria-labelledby="ai-source-title">
          <button type="button" class="sheet-close" aria-label="关闭上传图片面板" @click="closeSourceSheet">
            <v-icon icon="mdi-close" size="18" />
          </button>
          <h3 id="ai-source-title">上传人像开始定制</h3>
          <p class="source-hint">请选择正面、清晰、光线均匀的人像照片。</p>

          <div v-if="requiresGender" class="gender-field">
            <span>选择人像类型</span>
            <div role="radiogroup" aria-label="人像类型">
              <button
                type="button"
                role="radio"
                :aria-checked="gender === 'female'"
                :class="{ 'is-active': gender === 'female' }"
                @click="gender = 'female'"
              >
                女士
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="gender === 'male'"
                :class="{ 'is-active': gender === 'male' }"
                @click="gender = 'male'"
              >
                男士
              </button>
            </div>
          </div>

          <div class="source-options">
            <button type="button" @click="openImagePicker('camera')">
              <span class="source-icon" aria-hidden="true">
                <v-icon icon="mdi-camera-outline" size="30" />
              </span>
              <strong>相机拍摄</strong>
            </button>
            <button type="button" @click="openImagePicker('album')">
              <span class="source-icon" aria-hidden="true">
                <v-icon icon="mdi-image-outline" size="30" />
              </span>
              <strong>相册选取</strong>
            </button>
          </div>

          <label class="agreement-field">
            <input v-model="agreementAccepted" type="checkbox" />
            <span>我已阅读并同意 AI 定制协议</span>
          </label>
        </section>
      </div>
    </Transition>

    <Transition name="crop-dialog">
      <ImageCropDialog
        v-if="showCropDialog"
        :key="cropSourceUrl"
        :source-url="cropSourceUrl"
        :aspect-ratio="cropAspectRatio"
        :output-type="cropOutputType"
        :busy="uploading"
        @cancel="closeCropDialog"
        @confirm="handleCropConfirm"
      />
    </Transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { IMAGE_FILE_ACCEPT, isSupportedImageFile } from '../../../config/image-upload.js'
import { customerAiPosterApi } from '../api/customer-ai-poster.js'
import { customerAiSubjectApi } from '../api/customer-ai-subject.js'
import { customerPictureApi } from '../api/customer-picture.js'
import ImageCropDialog from './ImageCropDialog.vue'

const props = defineProps({
  aiSubjectIds: {
    type: [String, Number, Array],
    default: ''
  },
  title: {
    type: String,
    default: '选择 AI 主题'
  },
  description: {
    type: String,
    default: '选择主题后上传人像，即可生成专属效果。'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  appId: {
    type: Number,
    default: 10003
  },
  pollInterval: {
    type: Number,
    default: 2000
  },
  maxPollCount: {
    type: Number,
    default: 90
  }
})

const emit = defineEmits(['generated', 'error', 'topic-selected', 'request-close', 'update:generating'])
const albumInputRef = ref(null)
const cameraInputRef = ref(null)
const topics = ref([])
const selectedTopic = ref(null)
const loading = ref(false)
const loadError = ref('')
const operationStatus = ref({ type: 'success', text: '' })
const showSourceSheet = ref(false)
const showCropDialog = ref(false)
const cropSourceFile = ref(null)
const cropSourceUrl = ref('')
const cropOutputType = ref('jpeg')
const selectedSource = ref('album')
const gender = ref('male')
const agreementAccepted = ref(true)
const uploading = ref(false)
const generating = ref(false)
const progress = ref(0)
let pollTimer = null
let generationRequestId = 0
let topicLoadRequestId = 0

const requiresGender = computed(() => {
  return String(selectedTopic.value?.subjectType ?? '').toLowerCase() !== 'ai'
})

const cropAspectRatio = computed(() => {
  if (selectedSource.value === 'album' || !requiresGender.value) {
    return [1, 1]
  }

  return [367, 305]
})

watch(
  () => props.aiSubjectIds,
  () => {
    void loadTopics()
  },
  { immediate: true, deep: true }
)

watch(generating, (value) => emit('update:generating', value))

/** @returns {Promise<void>} 按主题 ID 加载可选项。 */
async function loadTopics() {
  const currentRequestId = ++topicLoadRequestId
  const ids = normalizeSubjectIds(props.aiSubjectIds)
  topics.value = []
  selectedTopic.value = null
  loadError.value = ''
  operationStatus.value = { type: 'success', text: '' }

  if (!ids) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const response = await customerAiSubjectApi.listByIds(ids)
    if (currentRequestId !== topicLoadRequestId) {
      return
    }
    const records = resolveTopicRecords(response)
    topics.value = records
    if (records.length === 1) {
      selectTopic(records[0])
    }
  } catch (error) {
    if (currentRequestId !== topicLoadRequestId) {
      return
    }
    console.error('[ai-topic] AI 主题加载失败', error)
    loadError.value = resolveErrorMessage(error, 'AI 主题加载失败，请稍后重试。')
    emit('error', { stage: 'topics', error })
  } finally {
    if (currentRequestId === topicLoadRequestId) {
      loading.value = false
    }
  }
}

/** @param {Object} topic AI 主题。 @returns {void} */
function selectTopic(topic) {
  if (props.disabled || generating.value) {
    return
  }

  selectedTopic.value = topic
  operationStatus.value = { type: 'success', text: '' }
  showSourceSheet.value = true
  emit('topic-selected', topic)
}

/** @returns {void} 关闭图片来源选择面板。 */
function closeSourceSheet() {
  showSourceSheet.value = false
  if (topics.value.length === 1) {
    emit('request-close')
  }
}

/** @param {'album' | 'camera'} source 图片来源。 @returns {void} */
function openImagePicker(source) {
  if (!agreementAccepted.value) {
    operationStatus.value = { type: 'warning', text: '请先阅读并同意 AI 定制协议。' }
    return
  }

  selectedSource.value = source
  const input = source === 'camera' ? cameraInputRef.value : albumInputRef.value
  input?.click()
}

/** @param {Event} event 文件选择事件。 @returns {void} */
function handleImageChange(event) {
  const file = event.target.files?.[0]
  if (event.target instanceof HTMLInputElement) {
    event.target.value = ''
  }
  if (!file) {
    return
  }
  if (!isSupportedImageFile(file)) {
    operationStatus.value = { type: 'error', text: '请选择有效的图片文件。' }
    return
  }

  showSourceSheet.value = false
  resetCropState()
  cropSourceFile.value = file
  cropOutputType.value = file.type === 'image/jpeg' ? 'jpeg' : 'png'
  cropSourceUrl.value = URL.createObjectURL(file)
  showCropDialog.value = true
}

/** @returns {void} 关闭裁剪弹框。 */
function closeCropDialog() {
  if (!uploading.value) {
    resetCropState()
  }
}

/** @returns {void} 释放裁剪文件状态。 */
function resetCropState() {
  showCropDialog.value = false
  cropSourceFile.value = null
  if (cropSourceUrl.value) {
    URL.revokeObjectURL(cropSourceUrl.value)
  }
  cropSourceUrl.value = ''
  cropOutputType.value = 'jpeg'
}

/** @param {Blob} blob 裁剪结果。 @returns {Promise<void>} */
async function handleCropConfirm(blob) {
  if (!selectedTopic.value || uploading.value) {
    return
  }

  uploading.value = true
  operationStatus.value = { type: 'success', text: '' }
  try {
    const file = createCroppedImageFile(blob, cropSourceFile.value, cropOutputType.value)
    const imageUrl = await customerPictureApi.upload(file)
    resetCropState()
    await startGeneration(imageUrl)
  } catch (error) {
    console.error('[ai-topic] 人像图片上传失败', error)
    operationStatus.value = { type: 'error', text: resolveErrorMessage(error, '图片上传失败，请重试。') }
    emit('error', { stage: 'upload', error })
  } finally {
    uploading.value = false
  }
}

/** @param {string} faceImageUrl 上传后的人像地址。 @returns {Promise<void>} */
async function startGeneration(faceImageUrl) {
  const topic = selectedTopic.value
  if (!topic) {
    return
  }

  const currentRequestId = ++generationRequestId
  const config = parseTopicConfig(topic.configDetail ?? topic.config_detail)
  const isAiTopic = String(topic.subjectType ?? '').toLowerCase() === 'ai'
  const prompt = isAiTopic
    ? config.prompt || ''
    : gender.value === 'female'
      ? config.prompt_woman || config.promptWoman || ''
      : config.prompt_man || config.promptMan || ''

  clearPolling()
  generating.value = true
  progress.value = 4
  operationStatus.value = { type: 'success', text: '' }

  try {
    const result = await customerAiPosterApi.createTask({
      appid: props.appId,
      face_img_url: faceImageUrl,
      subject: topic.subjectName || '',
      subject_type: topic.subjectType || '',
      sex: requiresGender.value ? (gender.value === 'female' ? '女' : '男') : '',
      prompt,
      person_x: toFiniteNumber(config.person_x ?? config.personX) ?? 0,
      person_y: toFiniteNumber(config.person_y ?? config.personY) ?? 0,
      person_size: toFiniteNumber(config.person_size ?? config.personSize) ?? 0,
      person_pose_img_file: config.person_pose_img_file || config.personPoseImgFile || ''
    })
    const taskUuid = String(result?.task_uuid ?? result?.taskUuid ?? '').trim()
    if (!taskUuid) {
      throw new Error('创建任务后未返回 task_uuid。')
    }
    await pollTask(taskUuid, currentRequestId, 0, faceImageUrl)
  } catch (error) {
    generationFailed(error, currentRequestId)
  }
}

/**
 * @param {string} taskUuid AI 任务 UUID。
 * @param {number} requestId 本次生成请求 ID。
 * @param {number} pollCount 已轮询次数。
 * @param {string} faceImageUrl 用户上传图片。
 * @returns {Promise<void>}
 */
async function pollTask(taskUuid, requestId, pollCount, faceImageUrl) {
  if (requestId !== generationRequestId || !generating.value) {
    return
  }

  try {
    const result = await customerAiPosterApi.getTaskDetail(taskUuid)
    if (requestId !== generationRequestId || !generating.value) {
      return
    }

    const status = String(result?.status ?? '')
    if (status === '生成成功') {
      const imageUrl = extractImageUrl(result?.task_detail ?? result?.taskDetail)
      if (!imageUrl) {
        throw new Error('任务已成功，但未返回生成图片地址。')
      }
      generationSucceeded(imageUrl, faceImageUrl, requestId)
      return
    }
    if (status === '生成失败') {
      throw new Error(resolveTaskFailureMessage(result))
    }

    const nextPollCount = pollCount + 1
    if (nextPollCount >= props.maxPollCount) {
      throw new Error('AI 生成超时，请重试。')
    }

    progress.value = Math.min(92, 8 + Math.floor((nextPollCount * 84) / 20))
    pollTimer = window.setTimeout(
      () => {
        void pollTask(taskUuid, requestId, nextPollCount, faceImageUrl)
      },
      Math.max(250, props.pollInterval)
    )
  } catch (error) {
    generationFailed(error, requestId)
  }
}

/** @param {string} imageUrl 生成图地址。 @param {string} faceImageUrl 原人像地址。 @param {number} requestId 请求 ID。 */
function generationSucceeded(imageUrl, faceImageUrl, requestId) {
  if (requestId !== generationRequestId) {
    return
  }

  const topic = selectedTopic.value
  const config = parseTopicConfig(topic?.configDetail ?? topic?.config_detail)
  progress.value = 100
  clearPolling()
  generating.value = false
  operationStatus.value = { type: 'success', text: 'AI 人像已生成。' }
  emit('generated', {
    imageUrl,
    faceImageUrl,
    topic,
    topicId: topic?.id,
    themeEntryId: `theme-${topic?.id || 'generated'}-${Date.now()}`,
    themeName: topic?.subjectName || 'AI 主题',
    backgroundImageUrls: normalizeUrlList(config.background_img_urls ?? config.backgroundImgUrls),
    gender: requiresGender.value ? gender.value : ''
  })
}

/** @param {*} error 原始错误。 @param {number} requestId 请求 ID。 */
function generationFailed(error, requestId) {
  if (requestId !== generationRequestId) {
    return
  }

  console.error('[ai-topic] AI 人像生成失败', error)
  clearPolling()
  generating.value = false
  operationStatus.value = { type: 'error', text: resolveErrorMessage(error, 'AI 图片生成失败，请重试。') }
  emit('error', { stage: 'generation', error })
}

/** @returns {void} 取消当前前端轮询。 */
function cancelGeneration() {
  generationRequestId += 1
  clearPolling()
  generating.value = false
  progress.value = 0
  operationStatus.value = { type: 'warning', text: '已取消等待生成结果。' }
}

/** @returns {void} 清理轮询定时器。 */
function clearPolling() {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer)
  }
  pollTimer = null
}

/** @param {Blob} blob 裁剪结果。 @param {File | null} sourceFile 原图。 @param {'jpeg' | 'png'} outputType 输出格式。 */
function createCroppedImageFile(blob, sourceFile, outputType) {
  const baseName = String(sourceFile?.name ?? 'portrait').replace(/\.[^.]+$/, '') || 'portrait'
  const extension = outputType === 'png' ? 'png' : 'jpg'
  return new File([blob], `${baseName}-cropped.${extension}`, {
    type: blob.type || `image/${outputType}`
  })
}

/** @param {*} value 主题 ID 配置。 @returns {string} 逗号分隔的 ID。 */
function normalizeSubjectIds(value) {
  const values = Array.isArray(value) ? value : [value]
  const ids = []

  values.forEach((item) => {
    const decoded = decodeRepeatedly(String(item ?? '')).trim()
    if (!decoded) {
      return
    }

    if (decoded.startsWith('[')) {
      try {
        const parsed = JSON.parse(decoded)
        if (Array.isArray(parsed)) {
          ids.push(...normalizeSubjectIds(parsed).split(',').filter(Boolean))
          return
        }
      } catch {
        // 非法 JSON 继续按逗号格式处理。
      }
    }

    decoded.split(',').forEach((candidate) => {
      const normalized = candidate.trim()
      const numericId = Number(normalized)
      if (/^\d+$/.test(normalized) && Number.isSafeInteger(numericId) && numericId > 0) {
        ids.push(normalized)
      }
    })
  })

  return [...new Set(ids)].join(',')
}

/** @param {*} response 主题列表响应。 @returns {Object[]} */
function resolveTopicRecords(response) {
  const candidates = [
    response,
    response?.data,
    response?.content,
    response?.result,
    response?.data?.data,
    response?.data?.content
  ]
  const records = candidates.find(Array.isArray) ?? []

  return records.map((record) => ({
    ...record,
    id: record?.id ?? record?.subjectId ?? record?.subject_id,
    previewImgUrl: record?.previewImgUrl ?? record?.preview_img_url ?? '',
    subjectName: record?.subjectName ?? record?.subject_name ?? '',
    subjectType: record?.subjectType ?? record?.subject_type ?? '',
    configDetail: record?.configDetail ?? record?.config_detail ?? {}
  }))
}

/** @param {*} value 主题 JSON 配置。 @returns {Object} */
function parseTopicConfig(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return {}
  }

  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

/** @param {*} value 任务详情。 @returns {string} 生成图地址。 */
function extractImageUrl(value) {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) {
      return value
    }
    try {
      return extractImageUrl(JSON.parse(value))
    } catch {
      return ''
    }
  }
  if (!value || typeof value !== 'object') {
    return ''
  }

  const fields = [
    'url',
    'image_url',
    'img_url',
    'poster_url',
    'poster_img_url',
    'output_url',
    'output_img_url',
    'result_url',
    'generated_image_url'
  ]
  for (const field of fields) {
    if (typeof value[field] === 'string' && value[field]) {
      return value[field]
    }
  }
  for (const nested of Object.values(value)) {
    const url = extractImageUrl(nested)
    if (url) {
      return url
    }
  }
  return ''
}

/** @param {*} value 可能是单个或多个 URL。 @returns {string[]} */
function normalizeUrlList(value) {
  return (Array.isArray(value) ? value : [value])
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter(Boolean)
}

/** @param {*} value 数字配置。 @returns {number} */
function toFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/** @param {*} result 任务结果。 @returns {string} */
function resolveTaskFailureMessage(result) {
  const detail = result?.task_detail ?? result?.taskDetail
  return typeof detail === 'string' && detail.trim() ? detail : 'AI 图片生成失败。'
}

/** @param {*} error 错误。 @param {string} fallback 默认文案。 @returns {string} */
function resolveErrorMessage(error, fallback) {
  return String(error?.message ?? error?.msg ?? error?.errmsg ?? fallback).trim() || fallback
}

/** @param {string} value 编码字符串。 @returns {string} */
function decodeRepeatedly(value) {
  let result = value
  for (let round = 0; round < 5; round += 1) {
    try {
      const decoded = decodeURIComponent(result)
      if (decoded === result) break
      result = decoded
    } catch {
      break
    }
  }
  return result
}

defineExpose({
  cancelGeneration,
  loadTopics
})

onBeforeUnmount(() => {
  topicLoadRequestId += 1
  generationRequestId += 1
  clearPolling()
  resetCropState()
})
</script>

<style lang="scss" scoped>
.ai-topic-picker {
  --topic-accent: #d9002d;
  --topic-accent-soft: #fff1f3;
  --topic-border: #dedfe2;
  --topic-ink: #202020;
  --topic-muted: #626262;
  display: grid;
  width: 100%;
  gap: 12px;
  color: var(--topic-ink);
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
}

.visually-hidden,
.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.topic-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.topic-heading h2,
.source-sheet h3 {
  margin: 0;
  color: var(--topic-ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.topic-heading p,
.source-hint {
  margin: 3px 0 0;
  color: var(--topic-muted);
  font-size: 11px;
  line-height: 1.55;
}

.retry-button,
.cancel-generation {
  padding: 0;
  border: 0;
  color: var(--topic-accent);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.topic-grid,
.topic-skeletons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.topic-card {
  display: grid;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 10px;
  gap: 0;
  color: var(--topic-ink);
  background: #ffffff;
  font: inherit;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(17, 24, 39, 0.12);
  transition:
    border-color 180ms ease-out,
    transform 180ms ease-out;
}

.topic-card:hover:not(:disabled) {
  transform: translateY(-1px);
}

.topic-card.is-selected {
  border-color: var(--topic-accent);
}

.topic-card:focus-visible,
.retry-button:focus-visible,
.cancel-generation:focus-visible,
.source-sheet button:focus-visible,
.agreement-field input:focus-visible {
  outline: 2px solid var(--topic-accent);
  outline-offset: 2px;
}

.topic-card:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.topic-image-wrap {
  position: relative;
  display: flex;
  aspect-ratio: 1;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  color: #77797d;
  background: #e5e6e8;
}

.topic-image-wrap img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.topic-tag {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 3px 7px;
  border-radius: 999px;
  color: #ffffff;
  background: rgba(175, 0, 37, 0.9);
  font-size: 9px;
  font-weight: 600;
}

.topic-name {
  padding: 9px 8px 10px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-skeleton {
  overflow: hidden;
  border-radius: 10px;
  background: #ffffff;
}

.topic-skeleton span,
.topic-skeleton i {
  display: block;
  background: #e8e9eb;
  animation: topic-pulse 1.2s ease-in-out infinite alternate;
}

.topic-skeleton span {
  aspect-ratio: 1;
}

.topic-skeleton i {
  width: 55%;
  height: 10px;
  margin: 11px auto;
  border-radius: 4px;
}

.topic-empty,
.generating-state {
  display: flex;
  min-height: 160px;
  padding: 24px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  border-radius: 10px;
  color: var(--topic-muted);
  background: #f4f5f6;
  text-align: center;
}

.topic-empty strong {
  color: var(--topic-ink);
  font-size: 13px;
}

.topic-empty span {
  font-size: 11px;
  line-height: 1.5;
}

.topic-empty.is-error,
.operation-status.is-error {
  color: #9f2636;
  background: #fff1f3;
}

.generating-state {
  min-height: 190px;
  color: var(--topic-ink);
  background: var(--topic-accent-soft);
}

.generating-copy {
  display: grid;
  gap: 4px;
}

.generating-copy strong {
  font-size: 14px;
}

.generating-copy span,
.progress-value {
  color: var(--topic-muted);
  font-size: 11px;
}

.progress-track {
  width: min(100%, 280px);
  height: 8px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #ffffff;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--topic-accent);
  transition: width 300ms ease-out;
}

.operation-status {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  color: #21643d;
  background: #eef8f1;
  font-size: 11px;
  line-height: 1.5;
}

.operation-status.is-warning {
  color: #7a4b00;
  background: #fff7e6;
}

.source-backdrop {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.56);
}

.source-sheet {
  position: relative;
  width: min(100%, 430px);
  padding: 24px 20px calc(18px + env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  background: #ffffff;
}

.sheet-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  color: #3f3f3f;
  background: #f0f1f2;
  cursor: pointer;
}

.source-hint {
  max-width: 32ch;
  padding-right: 34px;
}

.gender-field {
  display: grid;
  margin-top: 18px;
  gap: 8px;
  color: var(--topic-ink);
  font-size: 12px;
  font-weight: 600;
}

.gender-field > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.gender-field button {
  height: 36px;
  border: 1px solid var(--topic-border);
  border-radius: 8px;
  color: var(--topic-muted);
  background: #ffffff;
  font: inherit;
  cursor: pointer;
}

.gender-field button.is-active {
  border-color: var(--topic-accent);
  color: var(--topic-accent);
  background: var(--topic-accent-soft);
}

.source-options {
  display: grid;
  margin-top: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.source-options > button {
  display: flex;
  min-height: 122px;
  padding: 16px;
  border: 0;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #5c4729;
  background: #fff0df;
  font: inherit;
  cursor: pointer;
}

.source-icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--topic-accent);
  background: #ffffff;
}

.source-options strong {
  font-size: 13px;
}

.agreement-field {
  display: flex;
  margin-top: 14px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--topic-muted);
  font-size: 11px;
  cursor: pointer;
}

.agreement-field input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--topic-accent);
}

.picker-sheet-enter-active,
.picker-sheet-leave-active {
  transition: opacity 180ms ease-out;
}

.picker-sheet-enter-active .source-sheet,
.picker-sheet-leave-active .source-sheet {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.picker-sheet-enter-from,
.picker-sheet-leave-to {
  opacity: 0;
}

.picker-sheet-enter-from .source-sheet,
.picker-sheet-leave-to .source-sheet {
  transform: translateY(100%);
}

@keyframes topic-pulse {
  to {
    background: #d8dade;
  }
}

@media (min-width: 560px) {
  .topic-grid,
  .topic-skeletons {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .topic-card,
  .progress-track span,
  .picker-sheet-enter-active,
  .picker-sheet-leave-active,
  .picker-sheet-enter-active .source-sheet,
  .picker-sheet-leave-active .source-sheet {
    transition: none;
  }

  .topic-skeleton span,
  .topic-skeleton i {
    animation: none;
  }
}
</style>
