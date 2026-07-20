<template>
  <div ref="scrollContainer" class="h5-docs-page">
    <header class="h5-docs-header">
      <div class="h5-docs-brand">
        <v-icon icon="mdi-clipboard-text-outline" size="21" />
        <div>
          <strong>H5 模板配置规则</strong>
          <span>面向模板配置与运维人员</span>
        </div>
      </div>

      <nav class="h5-docs-actions" aria-label="文档页面导航">
        <router-link to="/docs">API 文档</router-link>
        <router-link to="/editor">编辑器</router-link>
      </nav>
    </header>

    <div class="h5-docs-layout">
      <aside class="h5-docs-sidebar">
        <label class="h5-docs-search">
          <v-icon icon="mdi-magnify" size="17" />
          <input v-model.trim="searchQuery" type="search" placeholder="搜索目录" aria-label="搜索运维文档目录" />
          <button v-if="searchQuery" type="button" aria-label="清空搜索" @click="searchQuery = ''">
            <v-icon icon="mdi-close" size="15" />
          </button>
        </label>

        <nav class="h5-docs-toc" aria-label="运维文档目录">
          <button
            v-for="item in filteredToc"
            :key="item.id"
            type="button"
            :class="[`is-level-${item.level}`, { 'is-active': activeHeadingId === item.id }]"
            @click="scrollToHeading(item.id)"
          >
            {{ item.title }}
          </button>
          <p v-if="filteredToc.length === 0">没有匹配的目录</p>
        </nav>
      </aside>

      <main class="h5-docs-main">
        <div class="h5-docs-summary">
          <v-icon icon="mdi-shield-check-outline" size="20" />
          <div>
            <strong>先选择页面，再按该页面规则配置图层</strong>
            <span>页面匹配的是图层属性，图层名称不能代替图片描述或文字描述。</span>
          </div>
        </div>
        <article ref="article" class="h5-docs-content" v-html="renderedMarkdown"></article>
      </main>
    </div>

    <button v-show="showBackToTop" type="button" class="h5-docs-back-top" aria-label="返回顶部" @click="scrollToTop">
      <v-icon icon="mdi-arrow-up" size="18" />
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Marked } from 'marked'

import markdownSource from './h5-page/README.md?raw'

const markdownParser = new Marked()
const renderedMarkdown = markdownParser.parse(markdownSource)
const scrollContainer = ref(null)
const article = ref(null)
const searchQuery = ref('')
const toc = ref([])
const activeHeadingId = ref('')
const showBackToTop = ref(false)
let observer = null

const filteredToc = computed(() => {
  const query = searchQuery.value.toLocaleLowerCase()
  return query
    ? toc.value.filter((item) => item.title.toLocaleLowerCase().includes(query))
    : toc.value
})

onMounted(async () => {
  await nextTick()
  const headings = [...(article.value?.querySelectorAll('h2, h3') ?? [])]
  toc.value = headings.map((heading, index) => {
    const id = `h5-doc-section-${index + 1}`
    heading.id = id
    return {
      id,
      level: Number(heading.tagName.slice(1)),
      title: heading.textContent?.trim() || `章节 ${index + 1}`
    }
  })

  observer = new IntersectionObserver(handleHeadingIntersection, {
    root: scrollContainer.value,
    rootMargin: '-76px 0px -72% 0px',
    threshold: [0, 1]
  })
  headings.forEach((heading) => observer.observe(heading))
  scrollContainer.value?.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  scrollContainer.value?.removeEventListener('scroll', handleScroll)
})

function handleHeadingIntersection(entries) {
  const visible = entries.find((entry) => entry.isIntersecting)
  if (visible) activeHeadingId.value = visible.target.id
}

function handleScroll() {
  showBackToTop.value = (scrollContainer.value?.scrollTop ?? 0) > 480
}

function scrollToHeading(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToTop() {
  scrollContainer.value?.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.h5-docs-page {
  height: 100vh;
  overflow: auto;
  color: #20242a;
  background: #f5f7f8;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.h5-docs-header {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  min-height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid #dfe3e6;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}

.h5-docs-brand,
.h5-docs-actions,
.h5-docs-search,
.h5-docs-summary {
  display: flex;
  align-items: center;
}

.h5-docs-brand {
  gap: 10px;
  color: #b42332;
}

.h5-docs-brand div {
  display: grid;
  gap: 1px;
}

.h5-docs-brand strong {
  color: #20242a;
  font-size: 15px;
}

.h5-docs-brand span {
  color: #697077;
  font-size: 12px;
}

.h5-docs-actions {
  gap: 8px;
}

.h5-docs-actions a {
  padding: 7px 10px;
  border-radius: 5px;
  color: #4d555c;
  font-size: 13px;
  text-decoration: none;
}

.h5-docs-actions a:hover,
.h5-docs-actions a:focus-visible {
  color: #a61f2d;
  background: #f6e9eb;
}

.h5-docs-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 920px);
  width: min(100%, 1220px);
  margin: 0 auto;
  align-items: start;
}

.h5-docs-sidebar {
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  padding: 20px 16px 28px;
  overflow-y: auto;
  border-right: 1px solid #dfe3e6;
  background: #f5f7f8;
}

.h5-docs-search {
  height: 36px;
  padding: 0 9px;
  border: 1px solid #cfd5d9;
  border-radius: 6px;
  gap: 7px;
  background: #ffffff;
}

.h5-docs-search:focus-within {
  border-color: #b42332;
  box-shadow: 0 0 0 2px rgba(180, 35, 50, 0.12);
}

.h5-docs-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  flex: 1;
  color: #20242a;
  background: transparent;
  font: inherit;
  font-size: 13px;
}

.h5-docs-search button {
  display: grid;
  padding: 2px;
  border: 0;
  place-items: center;
  color: #697077;
  background: transparent;
  cursor: pointer;
}

.h5-docs-toc {
  display: grid;
  margin-top: 16px;
  gap: 2px;
}

.h5-docs-toc button {
  min-height: 34px;
  padding: 7px 9px;
  border: 0;
  border-radius: 5px;
  color: #4d555c;
  background: transparent;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.h5-docs-toc button.is-level-3 {
  padding-left: 24px;
  color: #697077;
  font-size: 12px;
}

.h5-docs-toc button:hover,
.h5-docs-toc button.is-active {
  color: #a61f2d;
  background: #f2e4e6;
}

.h5-docs-toc p {
  color: #697077;
  font-size: 12px;
}

.h5-docs-main {
  min-width: 0;
  padding: 28px 40px 80px;
  background: #ffffff;
}

.h5-docs-summary {
  padding: 13px 15px;
  border: 1px solid #e2c7cb;
  border-radius: 6px;
  gap: 11px;
  color: #9d2432;
  background: #fff8f8;
}

.h5-docs-summary div {
  display: grid;
  gap: 2px;
}

.h5-docs-summary strong {
  color: #72212b;
  font-size: 13px;
}

.h5-docs-summary span {
  color: #695459;
  font-size: 12px;
}

.h5-docs-content {
  max-width: 78ch;
  margin-top: 26px;
}

.h5-docs-content :deep(h1) {
  margin: 0 0 12px;
  color: #171a1f;
  font-size: 28px;
  line-height: 1.3;
}

.h5-docs-content :deep(h2) {
  scroll-margin-top: 84px;
  margin: 42px 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e6e9;
  color: #20242a;
  font-size: 20px;
  line-height: 1.4;
}

.h5-docs-content :deep(h3) {
  scroll-margin-top: 84px;
  margin: 28px 0 10px;
  color: #32383e;
  font-size: 16px;
  line-height: 1.45;
}

.h5-docs-content :deep(p),
.h5-docs-content :deep(li) {
  color: #454c52;
  font-size: 14px;
  line-height: 1.8;
}

.h5-docs-content :deep(ol),
.h5-docs-content :deep(ul) {
  padding-left: 22px;
}

.h5-docs-content :deep(code) {
  padding: 2px 5px;
  border-radius: 4px;
  color: #8e2430;
  background: #f6edef;
  font-family: Consolas, 'SFMono-Regular', monospace;
  font-size: 0.9em;
}

.h5-docs-content :deep(table) {
  width: 100%;
  margin: 14px 0 22px;
  border-collapse: collapse;
  font-size: 13px;
}

.h5-docs-content :deep(th),
.h5-docs-content :deep(td) {
  padding: 10px 12px;
  border: 1px solid #dfe3e6;
  vertical-align: top;
  line-height: 1.6;
  text-align: left;
}

.h5-docs-content :deep(th) {
  color: #30363c;
  background: #f3f5f6;
  font-weight: 700;
}

.h5-docs-content :deep(tr:nth-child(even) td) {
  background: #fafbfb;
}

.h5-docs-back-top {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: grid;
  width: 38px;
  height: 38px;
  border: 1px solid #cfd5d9;
  border-radius: 6px;
  place-items: center;
  color: #4d555c;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(32, 36, 42, 0.1);
}

@media (max-width: 800px) {
  .h5-docs-header {
    padding: 0 14px;
  }

  .h5-docs-brand span {
    display: none;
  }

  .h5-docs-layout {
    display: block;
  }

  .h5-docs-sidebar {
    position: static;
    width: 100%;
    height: auto;
    padding: 12px 14px;
    border-right: 0;
    border-bottom: 1px solid #dfe3e6;
  }

  .h5-docs-toc {
    display: flex;
    padding-bottom: 4px;
    overflow-x: auto;
  }

  .h5-docs-toc button,
  .h5-docs-toc button.is-level-3 {
    padding: 7px 10px;
    flex: 0 0 auto;
  }

  .h5-docs-main {
    padding: 20px 16px 64px;
  }

  .h5-docs-content :deep(table) {
    display: block;
    overflow-x: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .h5-docs-page {
    scroll-behavior: auto;
  }
}
</style>
