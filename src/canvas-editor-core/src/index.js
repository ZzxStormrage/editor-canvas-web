import { EditorBuilder } from './core/EditorBuilder.js';

export { Editor } from './core/Editor.js';
export { EditorBuilder } from './core/EditorBuilder.js';
export { EditorState } from './core/EditorState.js';
export { ViewportManager } from './viewport/ViewportManager.js';
export { CommandManager } from './commands/CommandManager.js';
export { Command } from './commands/Command.js';
export { ZoomCommand } from './commands/canvas/ZoomCommand.js';
export { PluginManager } from './plugins/plugin-manager.js';
export { EventBus } from './logic/event-bus.js';
export { EditorError } from './errors/editor-error.js';
export { DEFAULT_CANVAS_CONFIG } from './config/index.js';
export {
  ElementDataPlugin,
  ELEMENT_DATA_KEY
} from './plugins/feature-plugins/element-data/element-data-plugin.js';
export { DocumentPlugin } from './plugins/feature-plugins/document/document-plugin.js';
export { EDITOR_DOCUMENT_VERSION, parseEditorDocument } from './utils/editor-document.js';
export { loadDocumentFonts, loadFontFace } from './utils/font.js';
export {
  DEFAULT_TEXT_LAYOUT,
  normalizeSingleLineText,
  normalizeTextLayout,
  resolveSingleLineFontSize
} from './utils/text-layout.js';
export {
  applyTextInputRules,
  DEFAULT_TEXT_INPUT_RULES,
  normalizeTextInputRules,
  supportsMultilineInput
} from './utils/text-input-rules.js';
export { TextPlugin } from './plugins/feature-plugins/text/text-plugin.js';
export { ImagePlugin } from './plugins/feature-plugins/image/image-plugin.js';
export { SvgRasterCachePlugin } from './plugins/feature-plugins/svg-raster-cache/svg-raster-cache-plugin.js';
export { SvgRasterCache, resolveRasterSize } from './plugins/feature-plugins/svg-raster-cache/svg-raster-cache.js';
export { LayerPlugin } from './plugins/feature-plugins/layer/layer-plugin.js';
export { HistoryPlugin } from './plugins/feature-plugins/history/history-plugin.js';
export { DEFAULT_PIXEL_DPI, formatMillimeter, pixelToMillimeter } from './utils/unit.js';

/**
 * 创建编辑器实例。
 *
 * `EditorBuilder` 负责组装 Leafer 场景、状态、视口、命令管理器和功能
 * 插件；调用方只通过返回的 `Editor` 外观 API 操作编辑器。
 *
 * @param {Object} [options={}] 编辑器初始化选项。
 * @returns {import('./core/Editor.js').Editor} 编辑器实例。
 */
export function createEditor(options = {}) {
  return new EditorBuilder(options).build();
}

/**
 * 保持旧版入口兼容。
 *
 * @deprecated 使用 `createEditor()`。
 * @type {typeof createEditor}
 */
export const init = createEditor;
