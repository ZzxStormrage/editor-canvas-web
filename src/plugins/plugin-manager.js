import { EditorError } from '../errors/editor-error.js';

/**
 * 插件管理器，负责按依赖顺序加载和销毁插件。
 *
 * @author zzx
 * @since 2026-06-30
 */
export class PluginManager {
  constructor() {
    /** @private @type {Map<string, Object>} */
    this._plugins = new Map();
  }

  /**
   * 注册插件。
   *
   * @param {Object} plugin 插件实例。
   * @returns {PluginManager} 当前管理器。
   * @throws {EditorError} 当插件缺少 id 或重复注册时抛出。
   */
  register(plugin) {
    if (!plugin?.id) {
      throw new EditorError('Plugin requires an id.', 'PLUGIN_ID_REQUIRED');
    }

    if (this._plugins.has(plugin.id)) {
      throw new EditorError(`Plugin already registered: ${plugin.id}`, 'PLUGIN_DUPLICATED');
    }

    this._plugins.set(plugin.id, plugin);

    return this;
  }

  /**
   * 初始化全部插件。
   *
   * @param {Object} context 全局上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this._getSortedPlugins().forEach((plugin) => {
      plugin.bootstrap?.(context);
    });
  }

  /**
   * 获取插件。
   *
   * @param {string} id 插件 ID。
   * @returns {Object | undefined} 插件实例。
   */
  get(id) {
    return this._plugins.get(id);
  }

  /**
   * 销毁全部插件，按注册顺序逆序销毁。
   *
   * @returns {void}
   */
  destroy() {
    [...this._plugins.values()].reverse().forEach((plugin) => {
      plugin.destroy?.();
    });
    this._plugins.clear();
  }

  /**
   * 按依赖关系排序插件。
   *
   * @private
   * @returns {Object[]} 排序后的插件列表。
   * @throws {EditorError} 当依赖缺失时抛出。
   */
  _getSortedPlugins() {
    const sorted = [];
    const visited = new Set();

    const visit = (plugin) => {
      if (visited.has(plugin.id)) {
        return;
      }

      visited.add(plugin.id);
      (plugin.dependencies ?? []).forEach((dependencyId) => {
        const dependency = this._plugins.get(dependencyId);

        if (!dependency) {
          throw new EditorError(
            `Plugin dependency missing: ${plugin.id} -> ${dependencyId}`,
            'PLUGIN_DEPENDENCY_MISSING'
          );
        }

        visit(dependency);
      });
      sorted.push(plugin);
    };

    this._plugins.forEach(visit);

    return sorted;
  }
}
