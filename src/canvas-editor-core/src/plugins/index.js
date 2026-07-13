import { ElementDataPlugin } from './feature-plugins/element-data/element-data-plugin.js'
import { ImagePlugin } from './feature-plugins/image/image-plugin.js'
import { LayerPlugin } from './feature-plugins/layer/layer-plugin.js'
import { TextPlugin } from './feature-plugins/text/text-plugin.js'

/**
 * 注册默认插件。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {import('./plugin-manager.js').PluginManager} pluginManager 插件管理器。
 * @returns {void}
 */
export function registerDefaultPlugins(pluginManager) {
  pluginManager.register(new ElementDataPlugin())
  pluginManager.register(new ImagePlugin())
  pluginManager.register(new TextPlugin())
  pluginManager.register(new LayerPlugin())
}
