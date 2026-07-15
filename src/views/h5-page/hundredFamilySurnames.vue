<template>
  <main class="page">
    <section class="web-view" aria-label="百家姓效果预览">
      <H5CanvasRenderer :document="documentData" />
    </section>

    <section class="page-container">
      <h2 class="title">输入姓氏/名字</h2>

      <div class="form">
        <label class="form-item">
          <span>姓</span>
          <input v-model="surname" type="text" placeholder="请输入姓氏，如：王" />
        </label>
        <label class="form-item">
          <span>名字</span>
          <input v-model="givenName" type="text" placeholder="请输入名字，如：小明" />
        </label>
      </div>

      <h2 class="title">选择字体风格</h2>
      <div class="font">
        <button
          v-for="item in 4"
          :key="item"
          type="button"
          class="font-item"
          :class="{ ischoice: selectedFont === item }"
          @click="selectedFont = item"
        >
          <span>王</span>
          <span>楷体</span>
        </button>
      </div>

      <button class="submit-button" type="button" @click="submit">提交</button>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'

import H5CanvasRenderer from '../../components/h5-preview/H5CanvasRenderer.vue'
import { applyH5Document } from '../../services/h5-document.js'
import '../../assets/scss/h5-preview.scss'

const documentData = reactive({
  version: 1,
  canvas: {
    width: 332,
    height: 418,
    background: '#ffffff'
  },
  elements: [
    {
      tag: 'Image',
      url: 'https://ele-aiketie.ele007.com/yinxiang/202607/ba7f4d19-5ec2-4b01-9a33-900e292660eb.jpg',
      name: '背景图',
      locked: true,
      x: 0,
      y: 0,
      width: 332,
      height: 418,
      lockRatio: false,
      draggable: true,
      editable: true,
      hittable: false,
      hitChildren: false,
      hitSelf: false,
      elementId: 'vGkZB6f_e3Lw2U4H7lwgQ',
      attributes: { image: { role: 'background' } }
    },
    {
      tag: 'Text',
      type: 'xing',
      width: 36,
      fill: '#FFFFFF',
      text: '张',
      fontFamily: '"PingFang SC"',
      fontSize: 36,
      fontWeight: 400,
      italic: false,
      textDecoration: 'none',
      letterSpacing: 0,
      lineHeight: 44,
      writingMode: 'x',
      textAlign: 'center',
      verticalAlign: 'top',
      x: 139.3772326832525,
      y: 65.5745404515007,
      draggable: true,
      editable: true,
      editConfig: { editSize: 'font-size' },
      elementId: '86WUpyHnzo1rTT5dvd92n',
      attributes: {}
    },
    {
      tag: 'Group',
      visible: false,
      draggable: false,
      editable: false,
      hittable: false,
      children: [
        {
          tag: 'Path',
          opacity: 0.9,
          visible: true,
          path: 'M 658.2095691090337 140.928955078125 L 658.2095691090337 558.928955078125',
          draggable: false,
          editable: false,
          hittable: false,
          stroke: '#4A90D9',
          strokeWidth: 1,
          dashPattern: [6, 4]
        },
        {
          tag: 'Path',
          opacity: 0.9,
          visible: false,
          path: 'M 500.8323364257813 349.928955078125 L 832.8323364257812 349.928955078125',
          draggable: false,
          editable: false,
          hittable: false,
          stroke: '#4A90D9',
          strokeWidth: 1,
          dashPattern: [6, 4]
        }
      ],
      x: -500.83233642578125,
      y: -140.928955078125,
      elementId: 'VrQmCNl_npeDMGSmBP1pF',
      attributes: {}
    },
    {
      type: 'ming',
      tag: 'Text',
      width: 72,
      fill: '#FFFFFF',
      text: '航航',
      fontFamily: '"PingFang SC"',
      fontSize: 36,
      fontWeight: 400,
      italic: false,
      textDecoration: 'none',
      letterSpacing: 0,
      lineHeight: 44,
      writingMode: 'x',
      textAlign: 'center',
      verticalAlign: 'top',
      x: 121.37723268325249,
      y: 193.98632046544049,
      draggable: true,
      editable: true,
      editConfig: { editSize: 'font-size' },
      elementId: 'sa68XWNJ6_l6VneWuc0yF',
      attributes: {}
    }
  ]
})

const surname = ref(findTextElement('xing')?.text ?? '')
const givenName = ref(findTextElement('ming')?.text ?? '')
const selectedFont = ref(0)

watch(surname, (value) => updateTextElement('xing', value))
watch(givenName, (value) => updateTextElement('ming', value))

function findTextElement(type) {
  return documentData.elements.find((element) => element.type === type)
}

function updateTextElement(type, text) {
  const element = findTextElement(type)
  if (!element) return
  element.text = text
  applyJson()
}

function applyJson() {
  const nextDocument = applyH5Document(JSON.stringify(documentData))
  Object.assign(documentData, nextDocument)
}

function submit() {
  applyJson()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 0 16px;
  color: #000000;
  background: #ffffff;
  font-family: Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.web-view {
  display: flex;
  width: 220px;
  height: 220px;
  margin: 14px auto;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background: #d9d9d9;
}

.web-view :deep(.h5-canvas) {
  flex: 0 0 auto;
  width: auto;
  height: 100%;
}

.page-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title {
  margin: 0;
  padding-left: 8px;
  border-left: 4px solid #cc343a;
  color: #000000;
  font-size: 16px;
  font-weight: bold;
  line-height: 1.4;
}

.form-item {
  display: block;
}

.form-item + .form-item {
  margin-top: 6px;
}

.form-item span {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: bold;
}

.form-item span::after {
  margin-right: 2px;
  color: #f53f3f;
  content: '*';
}

.form-item input {
  box-sizing: border-box;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #c5c5c5;
  border-radius: 8px;
  color: #000000;
  background: #ffffff;
  font: inherit;
  outline: none;
}

.form-item input:focus-visible {
  border-color: #cc343a;
}

.font {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 11px;
}

.font-item {
  display: flex;
  min-width: 0;
  padding: 10px;
  border: 1px solid transparent;
  aspect-ratio: 1 / 1;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  color: #5f5f5f;
  background: #e7e7e7;
  font-weight: bold;
}

.font-item span:first-child {
  font-size: 24px;
}

.font-item span:last-child {
  font-size: 12px;
}

.font-item.ischoice {
  border-color: #cc343a;
  color: #cc343a;
  background: #ffffff;
}

.font-item:focus-visible,
.submit-button:focus-visible {
  outline: 2px solid #cc343a;
  outline-offset: 2px;
}

.submit-button {
  width: 90%;
  height: 46px;
  margin: 20px auto 0;
  border: 0;
  border-radius: 5px;
  color: #ffffff;
  background: #d90226;
  font-size: 14px;
  font-weight: bold;
  line-height: 46px;
}

@media (min-width: 750px) {
  .page {
    width: 375px;
    margin: 0 auto;
  }
}
</style>
