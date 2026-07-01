Canvas 编辑器开发规范与架构设计 Skill
本 Skill 为开发一个功能完整的 Canvas 浏览器插件提供严格的架构设计和代码规范，采用纯 JavaScript（ES6+）编写，不依赖 TypeScript，但通过 JSDoc 保证类型安全。所有规则旨在提高代码的可维护性、可测试性和协作效率。

一、架构设计总览
1.1 分层架构（Layered Architecture）
系统严格分为四层，每层职责明确，层间通过清晰的接口通信，上层依赖下层，下层不依赖上层。

使用 https://www.leaferjs.com/ 中的 API作为渲染引擎。

┌─────────────────────────────────────────────────────────────┐
│                    UI 交互层 (UI Layer)                     │
│    工具栏、面板、快捷键、右键菜单、状态栏                    │
├─────────────────────────────────────────────────────────────┤
│                  功能插件层 (Plugin Layer)                  │
│    选择、绘图、形状、文字、图层、评论等独立插件              │
├─────────────────────────────────────────────────────────────┤
│                   业务逻辑层 (Logic Layer)                  │
│    状态管理 (Store)、命令系统 (Command)、事件总线 (EventBus)│
├─────────────────────────────────────────────────────────────┤
│                   渲染引擎层 (Render Layer)                 │
│    Canvas渲染器、场景图、脏区管理、变换矩阵                  │
└─────────────────────────────────────────────────────────────┘
1.2 核心设计模式
模式	应用场景	理由
插件模式 (Plugin)	所有功能模块（工具、面板、行为）	实现功能热插拔，降低耦合，便于单元测试
命令模式 (Command)	所有修改画布的操作（移动、删除、样式变更）	统一实现撤销/重做，支持操作历史记录
观察者模式 (Observer)	状态变更通知、插件间通信	解耦发布者和订阅者，支持多对多事件传递
工厂模式 (Factory)	创建图形元素（矩形、圆形、路径等）	封装对象创建逻辑，便于扩展新图形类型
策略模式 (Strategy)	不同工具的绘制行为（画笔、矩形、文字等）	运行时切换算法，避免大量的条件分支
状态机 (State Machine)	绘图工具的交互状态（空闲→绘制→预览→提交）	管理复杂交互流程，保证状态转换可预测
单例模式 (Singleton)	全局应用实例、事件总线、历史管理器	确保核心服务全局唯一，避免重复初始化
1.3 依赖方向
UI 层依赖 Plugin 层和 Logic 层。

Plugin 层依赖 Logic 层和 Render 层。

Logic 层依赖 Render 层（用于触发重绘）。

所有层禁止直接操作 DOM 或 Canvas 原生 API，必须通过 Render 层提供的接口。

二、项目目录结构规范
所有源代码放在 src/ 目录下，采用以下结构：

text
src/
├── core/                          # 渲染引擎层
│   ├── renderer.js                # 主渲染器 (CanvasRenderer)
│   ├── dirty-manager.js           # 脏区管理 (DirtyRegionManager)
│   ├── scene-graph.js             # 场景图 (SceneGraph)
│   ├── transform.js               # 矩阵变换工具
│   └── node-types/                # 图形节点类
│       ├── node.js                # 节点基类
│       ├── rect.js
│       ├── circle.js
│       ├── path.js
│       └── text.js
│
├── logic/                         # 业务逻辑层
│   ├── store/                     # 状态管理
│   │   ├── app-store.js           # 全局状态
│   │   ├── selection-store.js     # 选区状态
│   │   └── layer-store.js         # 图层状态
│   ├── command/                   # 命令系统
│   │   ├── command.js             # 命令基类
│   │   ├── history.js             # 命令历史 (撤销/重做)
│   │   └── commands/              # 具体命令实现
│   │       ├── move-command.js
│   │       ├── delete-command.js
│   │       └── ...
│   ├── state-machine/             # 状态机
│   │   ├── machine.js             # 状态机核心
│   │   └── drawing-states/        # 绘图状态定义
│   └── event-bus.js               # 全局事件总线
│
├── plugins/                       # 功能插件层
│   ├── core-plugins/              # 核心插件（必须）
│   │   ├── selection/             # 选择插件
│   │   ├── transform/             # 变换（移动/缩放/旋转）
│   │   └── viewport/              # 视口（平移/缩放）
│   ├── tool-plugins/              # 工具插件
│   │   ├── pen/                   # 画笔
│   │   ├── shape/                 # 形状（矩形/圆形等）
│   │   └── text/                  # 文字
│   └── feature-plugins/           # 功能插件
│       ├── layer/                 # 图层管理
│       ├── align/                 # 对齐分布
│       └── group/                 # 建组
│
├── ui/                            # UI 交互层
│   ├── components/                # UI 组件（纯函数或类）
│   │   ├── toolbar.js
│   │   ├── panel.js
│   │   └── context-menu.js
│   ├── shortcuts.js               # 快捷键映射
│   └── i18n.js                    # 国际化支持（可选）
│
├── utils/                         # 通用工具函数
│   ├── math.js                    # 数学工具
│   ├── color.js                   # 颜色处理
│   └── dom.js                     # DOM 操作封装
│
├── types/                         # JSDoc 类型定义（.js文件）
│   └── interfaces.js              # 接口定义（纯文档）
│
└── index.js                       # 应用入口（初始化所有层）
三、严格代码规范 (JavaScript)
3.1 命名规范
类型	规则	示例
文件名	kebab-case.js	dirty-manager.js
类名	PascalCase	CanvasRenderer, DirtyRegionManager
接口（JSDoc 定义）	PascalCase，无前缀	Renderable, Command
函数/方法	camelCase	getDirtyRegions(), handlePointerDown
变量（非私有）	camelCase	maxHistorySize, currentTool
常量（硬编码）	UPPER_SNAKE_CASE	MAX_HISTORY_SIZE, DEFAULT_FONT_SIZE
私有属性/方法	使用 # 前缀 (ES2022) 或 _ 前缀（需配合 @private JSDoc）	#ctx, _dirtyRegions
事件处理函数	on + 事件名 或 handle + 事件名	onPointerDown, handleKeyUp
布尔变量/函数	is / has / should 前缀	isDirty, hasSelection, shouldRender
3.2 代码风格 (基于 ESLint + Prettier)
缩进：2 个空格。

分号：必须使用分号结束语句。

引号：统一使用单引号 (')；模板字符串使用反引号。

括号：if、for、while 等必须使用大括号，即使单行。

换行：操作符换行时，操作符放在行末；函数参数过多时，每个参数单独一行。

最大行长度：100 字符。

3.3 类型安全 (使用 JSDoc)
由于不使用 TypeScript，必须为所有公开 API 编写完整的 JSDoc 注释，包括类型、参数和返回值。使用 @typedef 定义复杂类型。

javascript
/**
 * 矩形包围盒
 * @typedef {Object} Bounds
 * @property {number} x - 左上角 X
 * @property {number} y - 左上角 Y
 * @property {number} width - 宽度
 * @property {number} height - 高度
 */

/**
 * 渲染器接口
 * @interface Renderable
 * @method {function(CanvasRenderingContext2D): void} render - 渲染方法
 * @method {function(): Bounds} getBounds - 获取包围盒
 */

/**
 * 计算两个包围盒的相交区域
 * @param {Bounds} a - 第一个包围盒
 * @param {Bounds} b - 第二个包围盒
 * @returns {Bounds|null} 相交区域，无交集则返回 null
 */
export function intersectBounds(a, b) {
  // 实现...
}
3.4 模块导入导出
使用 ES 模块 (import / export)。

禁止使用 export default（除非是单文件入口聚合），推荐命名导出以便追踪来源。

导入顺序：外部依赖 → 内部模块 (按层级 core → logic → plugins → ui)。

每个文件只导出一个主要类或函数，但可以有多个辅助导出。

javascript
// ✅ 正确
import { CanvasRenderer } from '../core/renderer.js';
import { EventBus } from '../logic/event-bus.js';
import { ShapePlugin } from './shape-plugin.js';

export { ShapePlugin };
3.5 错误处理
所有可能失败的操作（如文件读取、网络请求、Canvas 操作）必须使用 try/catch。

自定义错误类：继承 Error，添加 code 属性用于区分错误类型。

全局未捕获异常：在入口处注册 window.onerror 和 unhandledrejection 进行统一日志记录。

禁止空 catch 块，至少记录警告日志。

javascript
class EditorError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'EditorError';
  }
}

try {
  // 危险操作
} catch (err) {
  console.error(`[EditorError] ${err.code}: ${err.message}`);
  // 上报或降级
}
3.6 异步处理
优先使用 async/await 而非裸 Promise。

循环中的异步操作必须使用 for...of 或 Promise.all 控制并发。

3.7 内存管理与性能
事件监听：每个绑定 addEventListener 的地方，必须记录以便后续移除。插件销毁时必须移除所有自身绑定的事件。

Canvas 渲染：必须使用脏区管理，避免全量重绘。每次绘制前调用 ctx.save()，绘制后调用 ctx.restore()。

缓存：频繁计算的结果（如包围盒、变换矩阵）应缓存，并在数据变化时失效。

动画：requestAnimationFrame 循环必须在页面不可见时暂停（使用 Page Visibility API）。

3.8 注释规范
文件头：每个源文件顶部注明作者、创建日期和简要描述。

类/函数注释：使用 JSDoc 格式，包含 @param、@returns、@throws 和 @example（可选）。

行内注释：解释复杂逻辑的“为什么”，而不是重复代码。

TODO/FIXME：必须标注 // TODO(username): 描述 并在后续版本清理。

javascript
/**
 * 脏区管理器 - 用于收集和合并需要重绘的矩形区域
 * @author 张三
 * @since 2026-01-01
 */
export class DirtyRegionManager {
  /**
   * 添加一个脏区
   * @param {Bounds} region - 需要重绘的区域
   * @throws {EditorError} 当区域无效时抛出
   */
  addDirtyRegion(region) {
    // TODO(zhangsan): 实现区域合并优化
    if (!region || region.width <= 0 || region.height <= 0) {
      throw new EditorError('Invalid dirty region', 'INVALID_REGION');
    }
    // 合并逻辑...
  }
}
四、插件开发规范
4.1 插件接口定义
每个插件必须实现以下生命周期方法（JSDoc 定义）：

javascript
/**
 * @interface Plugin
 */
class Plugin {
  /** @type {string} 唯一标识 */
  get id() {}
  /** @type {string} 显示名称 */
  get name() {}
  /** @type {string[]} 依赖的插件 ID 列表 */
  get dependencies() { return []; }

  /**
   * 初始化，在应用启动时调用一次
   * @param {Object} context - 全局上下文（包含渲染器、事件总线、命令历史等）
   * @returns {void | Promise<void>}
   */
  bootstrap(context) {}

  /**
   * 激活插件（如切换工具或打开面板）
   * @returns {void}
   */
  mount() {}

  /**
   * 更新插件状态（在全局状态变化时调用）
   * @param {Object} state - 变更后的状态片段
   * @returns {void}
   */
  update(state) {}

  /**
   * 渲染插件内容到画布（由渲染引擎调用）
   * @param {CanvasRenderingContext2D} ctx - 2D 上下文
   * @returns {void}
   */
  render(ctx) {}

  /**
   * 停用插件
   * @returns {void}
   */
  unmount() {}

  /**
   * 销毁插件，清理所有资源
   * @returns {void}
   */
  destroy() {}
}
4.2 插件注册与加载
所有插件在 src/plugins/index.js 中统一注册。

支持动态加载（代码分割），但核心插件必须在启动时加载。

插件之间的依赖关系必须显式声明，插件管理器按依赖顺序初始化。

4.3 插件通信
插件不应直接调用其他插件的方法，而应通过事件总线发送和接收事件。

事件命名采用 namespace:event 格式（如 selection:changed）。

五、状态管理规范
5.1 不可变状态
所有状态对象使用 Object.freeze() 冻结，防止直接修改。

状态变更必须通过 Store 提供的 dispatch(action) 方法触发，且 action 对象必须包含 type 和 payload。

5.2 状态更新流程
用户操作 → 命令执行 → 修改 Store 中的状态（生成新状态对象）。

Store 发布 state:changed 事件。

所有订阅者（插件、UI）收到通知并更新自身。

5.3 撤销/重做
每个命令对象必须实现 execute() 和 undo() 方法，命令历史存储已执行的命令。

命令执行后自动推入历史栈，撤销时从栈中弹出并调用 undo()。

六、测试规范
单元测试：使用 Jest 或 Mocha，覆盖核心逻辑（命令、状态机、工具函数）。

集成测试：测试插件与渲染引擎的交互，模拟用户事件。

测试文件放在 test/ 目录下，命名 *.test.js。

测试覆盖率要求：核心模块 ≥ 80%。

七、开发工作流
新功能开发：先在 plugins/ 下创建新插件目录，实现 Plugin 接口。

添加命令：如需撤销/重做，在 command/commands/ 下新增命令类。

更新状态：在 store/ 中添加新的状态字段和对应的 action。

UI 关联：在 ui/ 中添加工具栏按钮或菜单项，绑定快捷键。

编写测试：确保新功能有对应的单元测试。

八、版本与发布规范
使用语义化版本 MAJOR.MINOR.PATCH。

每次发布前更新 CHANGELOG.md，记录新增、变更和修复。

本 Skill 已包含所有必要的架构决策和代码规范，AI 助手在生成代码时需严格遵守以上规则，以确保项目长期可维护。

