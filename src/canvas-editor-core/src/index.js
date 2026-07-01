/*
 * @Author: zzx 452436275@qq.com
 * @Date: 2026-06-30 15:38:59
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-07-01 17:02:45
 * @FilePath: /ele-editor-v2/src/canvas-editor-core/src/index.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * canvas-editor-core 入口
 *
 * 架构概述（基于经典设计模式）：
 *
 *   EditorBuilder  → 建造者模式：链式构建编辑器
 *   Editor         → 外观模式：统一高层 API
 *   EditorState    → 代理模式：自动校验 + 事件
 *   ViewportManager → 策略模式：可插拔缩放策略
 *   CommandManager  → 命令模式：undo/redo 支持
 *   PluginManager   → 模板方法：插件生命周期
 *
 * 外部调用方只需：
 *   import { createEditor } from 'canvas-editor-core';
 *   const editor = createEditor({ view: '#app' });
 *   editor.setZoom(1.5);
 *
 * @author zzx
 * @since 2026-06-30
 */
import { EditorBuilder } from './core/EditorBuilder.js'

// ────── 子模块显式导出（按需 import） ──────
export { Editor } from './core/Editor.js'
export { EditorBuilder } from './core/EditorBuilder.js'
export { EditorState } from './core/EditorState.js'
export { ViewportManager } from './viewport/ViewportManager.js'
export { CommandManager } from './commands/CommandManager.js'
export { Command } from './commands/Command.js'
export { ZoomCommand } from './commands/canvas/ZoomCommand.js'
export { PluginManager } from './plugins/plugin-manager.js'
export { EventBus } from './logic/event-bus.js'
export { EditorError } from './errors/editor-error.js'
export { DEFAULT_CANVAS_CONFIG } from './config/index.js'
export { TextPlugin } from './plugins/feature-plugins/text/text-plugin.js'

// ────── 工厂函数（保持向后兼容的 init 接口） ──────

/**
 * 创建编辑器实例（工厂方法，语法糖）。
 *
 * 等价于：
 *   new EditorBuilder(options).build()
 *
 * @param {Object} [options={}] — 初始化参数
 * @returns {import('./core/Editor.js').Editor}
 * @throws {EditorError}
 */
export function createEditor(options = {}) {
  return new EditorBuilder(options).build()
}

/**
 * @deprecated — 使用 createEditor()
 * 保持向后兼容的 init 函数。
 */
export const init = createEditor
