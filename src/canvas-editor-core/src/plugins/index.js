import { ImagePlugin } from './feature-plugins/image/image-plugin.js';

/**
 * 注册默认插件。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {import('./plugin-manager.js').PluginManager} pluginManager 插件管理器。
 * @returns {void}
 */
export function registerDefaultPlugins(pluginManager) {
  pluginManager.register(new ImagePlugin());
}
