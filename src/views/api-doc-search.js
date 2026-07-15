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
    return {
      ...heading,
      searchContent,
      searchText: normalizeSearchText(searchContent)
    };
  });
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

  if (firstMatch < 0) return '';

  const start = Math.max(0, firstMatch - 18);
  const end = Math.min(content.length, firstMatch + 54);
  return `${start > 0 ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`;
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
