const API_SEARCH_ALIASES = Object.freeze({
  createEditor: ['创建编辑器', '初始化编辑器', '编辑器初始化'],
  'editor.setArtboardSize': ['调整画板', '画板尺寸', '修改画布大小'],
  'editor.fitArtboardToView': ['适配画板', '画板居中', '自适应画布'],
  'editor.image.add': ['添加图片', '新增图片', '插入图片', '上传图片'],
  'editor.replaceSelectedImage': ['替换选中图片', '更换选中图片'],
  'editor.replaceImage': ['替换图片', '更换图片', '图片替换', '替换指定图片'],
  'editor.image.getSize': ['图片原始尺寸', '读取图片尺寸', '图片宽高'],
  'editor.getSelectedImageProperties': ['图片属性', '读取图片属性'],
  'editor.updateSelectedImageProperties': ['修改图片属性', '调整图片位置', '调整图片大小'],
  'editor.resetSelectedImageSize': ['恢复图片原始大小', '重置图片尺寸'],
  'editor.text.add': ['添加文字', '新增文本', '插入文字'],
  'editor.text.update': ['修改文字', '更新文本', '文字样式'],
  'editor.replaceSelectedText': ['替换选中文字', '替换当前文字'],
  'editor.replaceText': ['替换文字', '文本替换', '修改指定文字'],
  'editor.layer.getList': ['获取图层', '图层列表'],
  'editor.layer.reorder': ['图层排序', '拖拽图层', '调整层级'],
  'editor.layer.toggleVisibility': ['显示图层', '隐藏图层', '图层显隐'],
  'editor.layer.toggleLock': ['锁定图层', '解锁图层'],
  'editor.layer.togglePointerThrough': ['点击穿透', '不可点击', '图片穿透'],
  'editor.getAllElements': ['获取所有元素', '全部元素', '遍历元素'],
  'editor.getElementsByRole': ['根据 role 获取元素', '角色查询', '背景图', '遮罩图'],
  'editor.getElementsByType': ['根据类型获取元素', '查询图片元素', '查询文字元素'],
  'editor.getElementsByAttribute': ['根据自定义属性获取元素', '自定义属性查询', 'description 查询'],
  'editor.elementData.set': ['添加自定义属性', '设置元素属性', '业务属性'],
  'editor.elementData.get': ['读取自定义属性', '获取元素属性'],
  'editor.loadDocument': ['加载 JSON', '还原 JSON', '导入模板', '回显模板'],
  'editor.exportDocument': ['获取 JSON', '导出 JSON', '保存 JSON'],
  'editor.markImageAsMask': ['标记遮罩图', '设置遮罩图'],
  'editor.createPrintArea': ['创建生产文件区域', '创建打印区域', '添加打印框'],
  'editor.detectPrintAreaFromMask': ['识别生产文件区域', '识别打印区域', '透明像素识别', '遮罩识别'],
  'editor.capturePrintArea': ['生产文件区域截图', '打印区域截图', '截取打印区域', '产品图'],
  'editor.captureCanvas': ['整图截图', '画布截图', '预览图'],
  'editor.groupSelection': ['组合元素', '组合节点'],
  'editor.ungroupSelection': ['解组', '取消组合'],
  'editor.undo': ['上一步', '撤销', '历史回退'],
  'editor.redo': ['下一步', '重做', '恢复撤销'],
  'editor.clearHistory': ['清空历史', '重置历史'],
  'editor.eventBus.on': ['监听事件', '订阅事件'],
  'editor.destroy': ['销毁编辑器', '卸载编辑器']
});

/**
 * 为文档标题附加所属章节的全文搜索内容。
 *
 * 四级标题正文归入最近的二级或三级标题，保证侧边栏未展示四级目录时仍可搜索。
 *
 * @param {string} markdown Markdown 文档。
 * @param {Array<Object>} headings 包含 id、level 和 lineIndex 的标题列表。
 * @returns {Array<Object>} 带 searchContent 和 searchText 的标题列表。
 */
export function buildHeadingSearchIndex(markdown, headings) {
  const lines = markdown.split('\n');
  const searchableHeadings = headings.filter((heading) => heading.level <= 3);
  const searchSectionEnds = new Map(
    searchableHeadings.map((heading, index) => [
      heading.id,
      searchableHeadings[index + 1]?.lineIndex ?? lines.length
    ])
  );

  return headings.map((heading, index) => {
    const nextLineIndex = searchSectionEnds.get(heading.id)
      ?? headings[index + 1]?.lineIndex
      ?? lines.length;
    const sectionSource = lines.slice(heading.lineIndex, nextLineIndex).join('\n');
    const searchContent = stripSearchMarkdown(sectionSource);
    const apiName = heading.apiName ?? extractApiName(heading.title);
    const aliases = API_SEARCH_ALIASES[apiName] ?? [];
    return {
      ...heading,
      apiName,
      aliases,
      searchContent,
      searchText: normalizeSearchText([
        searchContent,
        apiName,
        splitCamelCase(apiName),
        ...aliases
      ].join(' '))
    };
  });
}

/**
 * 按 API 名称、中文别名、标题和正文的优先级返回搜索结果。
 *
 * @param {Array<Object>} items 文档标题索引。
 * @param {*} query 搜索词。
 * @param {number} [limit=10] 最大结果数。
 * @returns {Array<Object>} 按相关性排序的标题。
 */
export function rankHeadingSearchResults(items, query, limit = 10) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(' ').filter(Boolean);

  if (!terms.length) return [];

  return items
    .map((item) => ({ item, score: scoreSearchItem(item, normalizedQuery, terms) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => left.score - right.score || left.item.lineIndex - right.item.lineIndex)
    .slice(0, limit)
    .map(({ item }) => item);
}

/**
 * 从章节正文自动提取公开方法，补充没有独立标题的 API 搜索项。
 *
 * 已有独立标题的方法始终优先；其余方法定位到正文首次出现的章节。
 *
 * @param {Array<Object>} headings 标题全文索引。
 * @returns {Array<Object>} 可用于搜索的标题和虚拟 API 索引。
 */
export function buildApiSearchEntries(headings) {
  const directApiNames = new Set(headings.map((heading) => heading.apiName).filter(Boolean));
  const virtualApiNames = new Set();
  const virtualEntries = [];

  headings.forEach((heading) => {
    extractApiNames(heading.searchContent).forEach((apiName) => {
      if (directApiNames.has(apiName) || virtualApiNames.has(apiName)) return;

      virtualApiNames.add(apiName);
      const aliases = API_SEARCH_ALIASES[apiName] ?? [];
      virtualEntries.push({
        ...heading,
        apiName,
        aliases,
        title: `${apiName}()`,
        searchKey: `${heading.id}:${apiName}`,
        searchText: normalizeSearchText([
          heading.searchContent,
          apiName,
          splitCamelCase(apiName),
          ...aliases
        ].join(' '))
      });
    });
  });

  return [...headings, ...virtualEntries];
}

/**
 * 从 Markdown 标题中提取公开 API 名称，不包含参数。
 *
 * @param {*} value 标题文本。
 * @returns {string} API 名称；普通章节返回空字符串。
 */
export function extractApiName(value) {
  const match = /(?:^|[`\s])((?:editor(?:\.[a-zA-Z][\w]*)+|createEditor|replaceH5Image|replaceH5Text|postBridgeMessage|createBridgeMessage|subscribeBridgeMessage|receiveBridgeMessage|postAccessToken))\s*\(/.exec(
    String(value ?? '')
  );
  return match?.[1] ?? '';
}

/** @param {*} value 文档正文。 @returns {string[]} 去重后的公开方法名。 */
function extractApiNames(value) {
  const matches = String(value ?? '').matchAll(
    /\b((?:editor(?:\.[a-zA-Z][\w]*)+|createEditor|replaceH5Image|replaceH5Text|postBridgeMessage|createBridgeMessage|subscribeBridgeMessage|receiveBridgeMessage|postAccessToken))\s*\(/g
  );
  return [...new Set([...matches].map((match) => match[1]))];
}

/**
 * 为 API 生成不受参数名称变化影响的稳定文档锚点。
 *
 * @param {string} apiName API 名称。
 * @returns {string} `api-` 开头的锚点。
 */
export function createApiAnchorId(apiName) {
  return `api-${splitCamelCase(apiName)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()}`;
}

/**
 * 统一搜索文本的大小写和空白。
 *
 * @param {*} value 原始搜索内容。
 * @returns {string} 规范化文本。
 */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 截取最早命中关键词附近的章节摘要。
 *
 * @param {string} content 章节纯文本。
 * @param {string[]} terms 搜索关键词。
 * @returns {string} 搜索结果摘要。
 */
export function createSearchSummary(content, terms) {
  const normalizedContent = content.toLowerCase();
  const firstMatch = terms.reduce((closest, term) => {
    const index = normalizedContent.indexOf(term);
    return index >= 0 && (closest < 0 || index < closest) ? index : closest;
  }, -1);

  if (firstMatch < 0) {
    return content.length > 72 ? `${content.slice(0, 72)}…` : content;
  }

  const start = Math.max(0, firstMatch - 18);
  const end = Math.min(content.length, firstMatch + 54);
  return `${start > 0 ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`;
}

/** @param {Object} item 标题索引。 @param {string} query 完整搜索词。 @param {string[]} terms 分词。 */
function scoreSearchItem(item, query, terms) {
  if (!terms.every((term) => item.searchText.includes(term))) return Number.POSITIVE_INFINITY;

  const apiText = normalizeSearchText(`${item.apiName} ${splitCamelCase(item.apiName)}`);
  const aliasText = normalizeSearchText(item.aliases.join(' '));
  const titleText = normalizeSearchText(item.title);
  const normalizedAliases = item.aliases.map(normalizeSearchText);
  let score = 80;

  if (normalizeSearchText(item.apiName) === query || normalizedAliases.includes(query)) score = 0;
  else if (apiText.startsWith(query)) score = 10;
  else if (apiText.includes(query)) score = 18;
  else if (aliasText.includes(query)) score = 24;
  else if (titleText.includes(query)) score = 36;

  return score + item.level * 2;
}

/** @param {*} value API 或普通文本。 @returns {string} 拆分 camelCase 后的文本。 */
function splitCamelCase(value) {
  return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\./g, ' ');
}

/**
 * 清理 Markdown 标记，保留可供搜索和摘要展示的正文。
 *
 * @param {string} value Markdown 片段。
 * @returns {string} 纯文本内容。
 */
function stripSearchMarkdown(value) {
  return value
    .replace(/```[\w-]*/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_~#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
