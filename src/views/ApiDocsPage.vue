<template>
  <div ref="scrollContainer" class="api-docs-page">
    <header class="api-docs-header">
      <div class="api-docs-brand">
        <v-icon icon="mdi-book-open-page-variant-outline" size="21" />
        <div>
          <strong>ELE Editor</strong>
          <span>开发者文档</span>
        </div>
      </div>

      <nav class="api-docs-actions" aria-label="文档页面导航">
        <router-link to="/editor">编辑器</router-link>
      </nav>
    </header>

    <div class="api-docs-layout">
      <aside class="api-docs-sidebar">
        <label class="api-docs-search">
          <v-icon icon="mdi-magnify" size="17" />
          <input v-model.trim="searchQuery" type="search" placeholder="搜索章节" aria-label="搜索 API 文档章节" />
          <button v-if="searchQuery" type="button" aria-label="清空搜索" @click="searchQuery = ''">
            <v-icon icon="mdi-close" size="15" />
          </button>
        </label>

        <nav class="api-docs-toc" aria-label="API 文档目录">
          <section
            v-for="module in filteredTocModules"
            :key="module.key"
            class="api-docs-toc-module"
            :class="`api-docs-module--${module.key}`"
          >
            <button
              type="button"
              class="api-docs-toc-module-header"
              :aria-expanded="isModuleExpanded(module.key)"
              @click="toggleModule(module.key)"
            >
              <v-icon :icon="module.icon" size="16" />
              <span>
                <strong>{{ module.label }}</strong>
                <small>{{ module.namespace }}</small>
              </span>
              <v-icon :icon="isModuleExpanded(module.key) ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
            </button>

            <div v-show="isModuleExpanded(module.key)" class="api-docs-toc-module-items">
              <button
                v-for="item in module.items"
                :key="item.id"
                type="button"
                :class="[`api-docs-toc-level-${item.level}`, { 'api-docs-toc-active': activeHeadingId === item.id }]"
                @click="scrollToHeading(item.id)"
              >
                {{ item.title }}
              </button>
            </div>
          </section>
          <p v-if="filteredTocModules.length === 0">没有匹配的模块或章节</p>
        </nav>
      </aside>

      <main class="api-docs-main">
        <div class="api-docs-intro">
          <span>API Reference</span>
          <strong>{{ documentStats.modules }} 个模块 · {{ documentStats.sections }} 个章节 · {{ documentStats.codeBlocks }} 个代码示例</strong>
        </div>
        <nav class="api-docs-module-index" aria-label="API 模块索引">
          <button
            v-for="module in apiModules"
            :key="module.key"
            type="button"
            :class="`api-docs-module--${module.key}`"
            @click="scrollToHeading(module.firstHeadingId)"
          >
            <v-icon :icon="module.icon" size="17" />
            <span>
              <strong>{{ module.label }}</strong>
              <small>{{ module.namespace }}</small>
            </span>
          </button>
        </nav>
        <article class="api-docs-content" @click="handleDocumentClick" v-html="renderedMarkdown"></article>
      </main>

      <button
        v-show="showBackToTop"
        type="button"
        class="api-docs-back-top"
        aria-label="返回顶部"
        @click="scrollToTop"
      >
        <v-icon icon="mdi-arrow-up" size="18" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { marked } from 'marked';

import markdownSource from '../../CANVAS_EDITOR_API.md?raw';
import '../assets/scss/api-docs.scss';

const MODULE_DEFINITIONS = [
  {
    key: 'guide',
    label: '接入指南',
    namespace: 'Application',
    icon: 'mdi-map-outline',
    headings: [
      '阅读路线',
      '快速开始',
      '调用边界',
      'Vue 应用层',
      '常见业务流程',
      '错误处理',
      'API 速查'
    ]
  },
  {
    key: 'core',
    label: 'Core 核心',
    namespace: 'createEditor / Editor',
    icon: 'mdi-cube-outline',
    headings: ['创建编辑器', 'Editor 实例', '生命周期']
  },
  {
    key: 'canvas',
    label: '画布画板',
    namespace: 'editor.artboard',
    icon: 'mdi-artboard',
    headings: ['画布与画板']
  },
  {
    key: 'viewport',
    label: '视口缩放',
    namespace: 'editor.setZoom',
    icon: 'mdi-magnify-scan',
    headings: ['视口缩放']
  },
  {
    key: 'selection',
    label: '选区',
    namespace: 'editor.select',
    icon: 'mdi-selection-drag',
    headings: ['选择']
  },
  {
    key: 'layer',
    label: '图层',
    namespace: 'editor.layer',
    icon: 'mdi-layers-outline',
    headings: ['图层']
  },
  {
    key: 'image',
    label: '图片',
    namespace: 'editor.image',
    icon: 'mdi-image-outline',
    headings: ['图片']
  },
  {
    key: 'text',
    label: '文字',
    namespace: 'editor.text',
    icon: 'mdi-format-text',
    headings: ['文本']
  },
  {
    key: 'event',
    label: '事件',
    namespace: 'editor.eventBus',
    icon: 'mdi-broadcast',
    headings: ['事件']
  },
  {
    key: 'command',
    label: '命令历史',
    namespace: 'editor.commands',
    icon: 'mdi-history',
    headings: ['命令与历史']
  },
  {
    key: 'data',
    label: '业务属性',
    namespace: 'editor.elementData',
    icon: 'mdi-database-outline',
    headings: ['元素业务属性']
  }
];

const MODULE_BY_KEY = new Map(MODULE_DEFINITIONS.map((module) => [module.key, module]));
const searchQuery = ref('');
const activeHeadingId = ref('');
const showBackToTop = ref(false);
const scrollContainer = ref(null);
const expandedModules = ref(new Set(['guide', 'core']));
const toc = createTableOfContents(markdownSource);
const tocModules = createTocModules(toc);
let observer = null;

const filteredTocModules = computed(() => {
  const keyword = searchQuery.value.toLowerCase();

  if (!keyword) return tocModules;

  return tocModules.flatMap((module) => {
    const moduleMatched = `${module.label} ${module.namespace}`.toLowerCase().includes(keyword);
    const items = moduleMatched
      ? module.items
      : module.items.filter((item) => item.title.toLowerCase().includes(keyword));

    return items.length ? [{ ...module, items }] : [];
  });
});

const apiModules = tocModules.filter((module) => module.key !== 'guide');

const documentStats = {
  modules: apiModules.length,
  sections: toc.filter((item) => item.level === 2).length,
  codeBlocks: (markdownSource.match(/```/g)?.length ?? 0) / 2
};

const renderedMarkdown = renderMarkdown(markdownSource, toc);

onMounted(() => {
  const headings = toc.map((item) => document.getElementById(item.id)).filter(Boolean);
  observer = new IntersectionObserver(updateActiveHeading, {
    root: scrollContainer.value,
    rootMargin: '-72px 0px -72% 0px',
    threshold: [0, 1]
  });
  headings.forEach((heading) => observer.observe(heading));
  scrollContainer.value?.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  scrollContainer.value?.removeEventListener('scroll', updateScrollState);
});

function createTableOfContents(markdown) {
  const slugCount = new Map();
  let currentModule = MODULE_DEFINITIONS[0];

  return markdown.split('\n').flatMap((line) => {
    const match = /^(#{2,4})\s+(.+)$/.exec(line);
    if (!match) return [];

    const title = stripMarkdown(match[2]);
    if (match[1].length === 2) currentModule = resolveModule(title);
    const baseId = createSlug(title);
    const count = slugCount.get(baseId) ?? 0;
    slugCount.set(baseId, count + 1);

    return [{
      level: match[1].length,
      title,
      id: count ? `${baseId}-${count + 1}` : baseId,
      moduleKey: currentModule.key
    }];
  });
}

function createTocModules(items) {
  return MODULE_DEFINITIONS.flatMap((module) => {
    const moduleItems = items.filter((item) => item.moduleKey === module.key && item.level <= 3);
    const firstHeading = moduleItems.find((item) => item.level === 2) ?? moduleItems[0];

    return moduleItems.length
      ? [{ ...module, items: moduleItems, firstHeadingId: firstHeading.id }]
      : [];
  });
}

function renderMarkdown(markdown, headings) {
  let headingIndex = 0;
  let previousModuleKey = '';
  const html = marked.parse(markdown, { gfm: true, breaks: false });

  return html
    .replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (match, level, content) => {
      const heading = headings[headingIndex++];
      if (!heading) return match;

      const module = MODULE_BY_KEY.get(heading.moduleKey);
      const moduleMarker = Number(level) === 2 && module?.key !== previousModuleKey
        ? `<div class="api-docs-module-marker api-docs-module--${module.key}"><span>${module.label}</span><code>${module.namespace}</code></div>`
        : '';

      if (Number(level) === 2) previousModuleKey = module?.key ?? previousModuleKey;
      return `${moduleMarker}<h${level} id="${heading.id}">${content}</h${level}>`;
    })
    .replace(/<pre><code/g, '<div class="api-docs-code"><button type="button" data-copy-code>复制</button><pre><code')
    .replace(/<\/code><\/pre>/g, '</code></pre></div>');
}

function resolveModule(title) {
  return MODULE_DEFINITIONS.find((module) => module.headings.includes(title)) ?? MODULE_DEFINITIONS[0];
}

function stripMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
}

function createSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function scrollToHeading(id) {
  const heading = document.getElementById(id);
  const container = scrollContainer.value;

  if (!heading || !container) return;

  const top = heading.getBoundingClientRect().top
    - container.getBoundingClientRect().top
    + container.scrollTop
    - 68;
  container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function isModuleExpanded(moduleKey) {
  return Boolean(searchQuery.value) || expandedModules.value.has(moduleKey);
}

function toggleModule(moduleKey) {
  const nextModules = new Set(expandedModules.value);

  if (nextModules.has(moduleKey)) nextModules.delete(moduleKey);
  else nextModules.add(moduleKey);

  expandedModules.value = nextModules;
}

function updateActiveHeading(entries) {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

  if (visible[0]?.target?.id) {
    activeHeadingId.value = visible[0].target.id;
    const activeItem = toc.find((item) => item.id === activeHeadingId.value);

    if (activeItem && !expandedModules.value.has(activeItem.moduleKey)) {
      expandedModules.value = new Set([...expandedModules.value, activeItem.moduleKey]);
    }
  }
}

function updateScrollState() {
  showBackToTop.value = (scrollContainer.value?.scrollTop ?? 0) > 560;
}

function scrollToTop() {
  scrollContainer.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleDocumentClick(event) {
  const copyButton = event.target.closest('[data-copy-code]');
  if (!copyButton) return;

  const code = copyButton.parentElement?.querySelector('code')?.textContent ?? '';

  try {
    await navigator.clipboard.writeText(code);
    copyButton.textContent = '已复制';
    window.setTimeout(() => { copyButton.textContent = '复制'; }, 1200);
  } catch {
    copyButton.textContent = '复制失败';
  }
}

</script>
