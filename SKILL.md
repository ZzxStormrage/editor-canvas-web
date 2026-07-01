# canvas-editor-core 架构设计与开发规范

本项目基于 [LeaferJS](https://www.leaferjs.com/) 渲染引擎，采用纯 JavaScript (ES6+) 编写，融合 6 种经典设计模式，确保代码高可读、低耦合、易扩展。本文档作为 AI 助手的代码生成唯一规范来源。

---

## 一、架构总览

### 1.1 分层架构

```
┌──────────────────────────────────────────────────────────────────┐
│                    入口层 (Entry Layer)                          │
│   index.js — 工厂函数 createEditor() + 显式导出所有子模块        │
├──────────────────────────────────────────────────────────────────┤
│                    核心层 (Core Layer)                           │
│   Editor.js          → 外观模式：统一高层 API                     │
│   EditorBuilder.js   → 建造者模式：链式构建编辑器                 │
│   EditorState.js     → 代理模式：Proxy 拦截 + 自动校验 + 事件     │
├──────────────────────────────────────────────────────────────────┤
│                    视口层 (Viewport Layer)                       │
│   ViewportManager.js         → 策略模式：缩放引擎                │
│   strategies/WheelZoomStrategy.js   → 滚轮缩放                   │
│   strategies/PinchZoomStrategy.js   → 捏合缩放                   │
├──────────────────────────────────────────────────────────────────┤
│                    命令层 (Command Layer)                        │
│   Command.js           → 命令基类：execute/undo/redo/merge       │
│   CommandManager.js    → 命令模式：undo/redo 历史栈              │
│   canvas/ZoomCommand.js → 具体命令                               │
├──────────────────────────────────────────────────────────────────┤
│                    逻辑层 (Logic Layer)                          │
│   event-bus.js         → 观察者模式：namespace:event 格式        │
├──────────────────────────────────────────────────────────────────┤
│                    插件层 (Plugin Layer)                         │
│   plugin-manager.js    → 模板方法模式：依赖排序 + 生命周期        │
│   feature-plugins/image/image-plugin.js → 图片插件               │
├──────────────────────────────────────────────────────────────────┤
│                    工具层 (Utility Layer) + 配置 + 错误           │
│   utils/  config/  errors/  area.js                              │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 依赖方向（严格单向）

```
入口层 → 核心层 → 视口层 / 命令层 / 逻辑层 → 插件层 → 工具层
                                               ↘ 配置层
```

- **上层可依赖下层，下层禁止引用上层。**
- **同层模块之间尽量不互相引用**，通过 EventBus 通信。
- **工具层是纯函数，无任何上层依赖。**
- **插件层只依赖逻辑层和工具层**，不依赖核心层。

### 1.3 核心设计模式及落点

| 模式 | 对应类/文件 | 职责 |
|------|------------|------|
| **外观模式** | `core/Editor.js` | 为复杂子系统提供统一 API，自身不实现逻辑 |
| **建造者模式** | `core/EditorBuilder.js` | 4 步链式构建：Leafer → Scene → Services → Editor |
| **代理模式** | `core/EditorState.js` | Proxy 拦截 `set`，自动校验 + 钳位 + 发布事件 |
| **策略模式** | `viewport/ViewportManager.js` + `strategies/` | 缩放算法可插拔，无锚点/有锚点统一入口 |
| **命令模式** | `commands/Command.js` + `commands/CommandManager.js` | 所有写操作可撤销，50 步历史栈 |
| **观察者模式** | `logic/event-bus.js` | 解耦模块通信，`namespace:event` 命名格式 |
| **模板方法模式** | `plugins/plugin-manager.js` | 插件统一生命周期：bootstrap → destroy |

---

## 二、目录结构规范

```
canvas-editor-core/src/
├── index.js                         # 入口：createEditor() + 显式导出
│
├── core/                            # 核心层
│   ├── Editor.js                    # 外观类
│   ├── EditorBuilder.js             # 建造者
│   └── EditorState.js               # 代理状态
│
├── viewport/                        # 视口层
│   ├── ViewportManager.js           # 缩放管理器
│   └── strategies/                  # 缩放策略
│       ├── WheelZoomStrategy.js     # 滚轮策略
│       └── PinchZoomStrategy.js     # 捏合策略
│
├── commands/                        # 命令层
│   ├── Command.js                   # 命令基类
│   ├── CommandManager.js            # 历史管理
│   └── canvas/                      # 画布类命令
│       └── ZoomCommand.js
│
├── logic/                           # 逻辑层
│   └── event-bus.js                 # 事件总线
│
├── plugins/                         # 插件层
│   ├── index.js                     # 插件注册入口
│   ├── plugin-manager.js            # 插件管理器
│   └── feature-plugins/             # 功能插件
│       └── image/
│           └── image-plugin.js
│
├── utils/                           # 工具层（纯函数，无上层依赖）
│   ├── options.js                   # 参数归一化
│   ├── image.js                     # 图片配置归一化
│   ├── number.js                    # 数值校验
│   ├── grid.js                      # 网格配置归一化
│   ├── zoom.js                      # 缩放配置归一化
│   ├── view.js                      # 视口 DOM 解析
│   ├── dom.js                       # DOM 操作封装
│   └── assert.js                    # 断言工具
│
├── config/
│   └── index.js                     # DEFAULT_CANVAS_CONFIG
│
├── errors/
│   └── editor-error.js              # EditorError
│
└── area.js                          # 画布背景 + 网格绘制
```

### 2.1 目录命名规则

- 目录名：`kebab-case`（如 `feature-plugins`、`canvas-editor-core`）
- 文件名：`kebab-case.js`（如 `event-bus.js`、`plugin-manager.js`）
- 策略文件放在子目录 `strategies/` 中
- 具体命令放在 `commands/canvas/` 等下位目录

---

## 三、编码规范

### 3.1 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 文件名 | `kebab-case.js` | `event-bus.js`、`image-plugin.js` |
| 类名 | PascalCase | `EditorState`、`ViewportManager` |
| 函数/方法 | camelCase | `setZoom()`、`handlePointerDown()` |
| 变量 | camelCase | `contentLayer`、`newZoom` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_CANVAS_CONFIG` |
| 私有字段 | ES2022 `#` 前缀 | `#state`、`#bus`、`#leafer` |
| 事件处理 | `on + 事件名` 或 `handle + 事件名` | `onPointerDown`、`handleWheel` |
| 布尔变量 | `is / has / should / can` 前缀 | `canUndo`、`showGrid`、`isDirty` |
| 私有方法（非 `#` 场景） | `_` 前缀 + `@private` JSDoc | `_assertReady()`、`_getSortedPlugins()` |

### 3.2 代码风格

- **缩进**：2 个空格
- **分号**：必须使用分号结束语句
- **引号**：统一单引号 `'`；模板字符串用反引号 `` ` ``
- **大括号**：`if/for/while` 必须使用大括号，即使单行
- **最大行长**：100 字符
- **箭头函数**：简单回调使用箭头函数；需要 `this` 或复杂逻辑使用命名方法

```js
// ✅ 正确
if (this.canUndo) {
  this.#stack[this.#pointer].undo();
  this.#pointer--;
}

// ❌ 错误
if (this.canUndo) this.#stack[this.#pointer--].undo();
```

### 3.3 模块导入导出

- **禁止 `export default`**（入口 `index.js` 除外），统一使用命名导出
- **导入顺序**：外部依赖 → 内部模块（按依赖层级）
- **每个文件只导出一个主类**，辅助函数可额外导出

```js
// ✅ 正确
import { Leafer, Group } from 'leafer-ui';
import { DEFAULT_CANVAS_CONFIG } from '../config/index.js';
import { EditorState } from './EditorState.js';
import { normalizeInitOptions } from '../utils/options.js';

export { EditorBuilder };

// ❌ 错误
import { normalizeInitOptions } from './utils/options';  // 缺少 .js 后缀
export default class EditorBuilder {}                     // 禁止 default export
```

### 3.4 私有字段规范

类内部统一使用 ES2022 **私有字段** `#` 语法：

```js
export class Editor {
  /** @type {Proxy} — 代理状态 */
  #state;
  /** @type {EventBus} */
  #bus;
  /** @type {ViewportManager} */
  #viewport;

  // 公开只读访问器
  get state() { return this.#state; }
}
```

非类的工具模块中使用 `_` 前缀标记内部函数，通过局部作用域限制可见性。

### 3.5 JSDoc 注释规范

所有**公开导出**的类、方法、函数必须写完整 JSDoc。私有方法写简要说明。

```js
/**
 * 视口缩放管理器 —— **策略模式**
 *
 * 将缩放交互逻辑集中管理，不再直接 patch leafer 内部对象。
 *
 * @author zzx
 * @since 2026-07-01
 */
export class ViewportManager {
  /**
   * 执行缩放 —— 所有策略最终调用的统一入口。
   *
   * @param {Object} params
   * @param {number} params.scale — 缩放因子
   * @param {number} [params.anchorX] — 缩放锚点 X
   * @param {number} [params.anchorY] — 缩放锚点 Y
   */
  zoom({ scale, anchorX, anchorY }) { ... }
}
```

### 3.6 错误处理

- 所有编辑器错误使用 `EditorError`，必须传入 `code`：
  ```js
  throw new EditorError('缺少插件 ID', 'PLUGIN_ID_REQUIRED');
  ```
- 错误码使用 `UPPER_SNAKE_CASE`，语义化命名
- `try/catch` 中捕获外部错误后重新包装为 `EditorError`
- **禁止空 `catch` 块**，至少 `console.warn`
- EventBus 中监听器异常不向上传播，内部 catch 并日志

### 3.7 异步处理

- 统一使用 `async/await`，避免裸 `Promise.then()`
- 插件中的异步初始化返回 `Promise`，由调用方处理
- 循环中的异步操作使用 `for...of` 或 `Promise.all`

---

## 四、核心模块编写规范

### 4.1 Editor（外观模式）

`Editor` 自身不实现业务逻辑，将所有调用委托给子系统：

```js
export class Editor {
  #leafer;
  #stage;
  #contentLayer;
  #state;      // Proxy
  #bus;        // EventBus
  #pluginManager;
  #viewport;   // ViewportManager
  #commands;   // CommandManager

  // 所有公开方法返回 this 以支持链式调用
  setZoom(z) {
    this.#viewport.setZoom(z);
    return this;
  }
}
```

**规则**：
- Editor 构造函数接受 8 个参数（leafer, stage, contentLayer, state, bus, pluginManager, viewport, commandManager）
- 每个公开方法返回 `this` 支持链式调用
- 读属性通过 getter 暴露子系统引用
- 写操作委托给对应子系统

### 4.2 EditorBuilder（建造者模式）

```js
export class EditorBuilder {
  constructor(rawOptions) {
    this.#options = normalizeInitOptions(rawOptions);
    this.#view = resolveView(this.#options.view);
    this.#size = resolveSize(this.#view, this.#options);
  }

  buildLeafer()    { /* 创建 Leafer */ return this; }
  buildScene()     { /* 搭建 stage/contentLayer/area */ return this; }
  buildServices()  { /* 事件总线、插件、命令、视口 */ return this; }
  buildEditor()    { /* 组装 Editor */ return editor; }

  build() { return this.buildLeafer().buildScene().buildServices().buildEditor(); }
}
```

**规则**：
- constructor 只做参数归一化
- 每个 `build*()` 方法返回 `this`
- `build()` 是语法糖，一键构建
- 不在构建步骤之间做复杂逻辑判断

### 4.3 EditorState（代理模式）

```js
export class EditorState {
  #bus;
  #raw;        // 内部原始数据
  proxy;       // 对外暴露的 Proxy

  constructor(initial, bus) {
    this.#bus = bus;
    this.#raw = { ...initial, destroyed: false };
    this.proxy = new Proxy(this.#raw, {
      set(target, key, value) {
        const clamped = self.#clamp(key, value, target);
        target[key] = clamped;
        self.#emit(key, clamped, old, target);
        return true;
      }
    });
  }
}
```

**规则**：
- 外部通过 `state.proxy` 访问代理对象
- `#clamp()` 对 `zoom` 做钳位、对 `zoomOptions/areaType/showGrid` 做校验
- `#emit()` 自动发布 `viewport:zoom-changed`、`canvas:resized` 等事件
- `showGrid` 和 `areaType` 联动修改
- `#clamp` 只修改非法值；合法值应原样返回（default 分支）

**特别注意**：
必须理解并严格按照这里的逻辑编码，当用户问及缩放的联动关系、状态校验、事件发布等问题时，以 EditorState.js 中的 Proxy 逻辑为唯一答案。

### 4.4 ViewportManager（策略模式）

```js
export class ViewportManager {
  #leafer;
  #stage;
  #state;
  #bus;
  #strategies = {
    wheel: new WheelZoomStrategy(),
    pinch: new PinchZoomStrategy(),
  };

  zoom({ scale, anchorX, anchorY, source }) { /* 统一缩放引擎 */ }
  setZoom(z)    { /* 无锚点缩放 */ }
  zoomIn(step)  { /* 放大 */ }
  zoomOut(step) { /* 缩小 */ }
  resetZoom()   { /* 重置 */ }
  setupInteraction() { /* 安装策略 */ }
}
```

**规则**：
- `zoom()` 是唯一缩放入口，所有策略汇聚于此
- `setZoom/zoomIn/zoomOut/resetZoom` 不传锚点，直接设 scale
- `setupInteraction()` 在 `EditorBuilder.buildEditor()` 中调用，安装到 `leafer.interaction`
- 缩放完成后通过 `#state.zoom = newZoom` 触发 Proxy 事件
- 锚点缩放公式：`stage.x = anchorX - (anchorX - sx) * ratio`

**策略实现规范**：
- 每个策略一个文件，放在 `strategies/` 下
- 暴露 `handle(data, config)` 方法，返回 `{ scale, anchorX, anchorY }` 或 `null`
- 极小变化（abs(scale - 1) < 0.001）返回 `null` 忽略
- 策略不直接操作 stage 或 state，只做纯计算

### 4.5 命令系统（命令模式）

```js
// 基类
export class Command {
  reversible = true;
  execute() { throw new Error('Command.execute() must be overridden.'); }
  undo()    { /* 子类覆盖 */ }
  redo()    { return this.execute(); }
  merge(_cmd) { return false; }
}

// 管理器
export class CommandManager {
  #stack = [];        // 历史栈
  #pointer = -1;      // 当前指针
  #maxSize = 50;

  execute(command) { /* 执行并压栈，支持合并 */ }
  undo()  { /* 回退 */ }
  redo()  { /* 前进 */ }
  get canUndo() { ... }
  get canRedo() { ... }
}
```

**规则**：
- 具体命令放在 `commands/canvas/` 等下位目录
- 命令必须实现 `execute()` 和 `undo()`
- `execute()` 前记录 `#previousZoom`（或其他旧值），`undo()` 时恢复
- 命令通过 `command.merge()` 支持合并（如连续缩放合并为一条）
- 执行后通过 `history:changed` 事件通知 UI 更新按钮状态

### 4.6 EventBus（观察者模式）

```js
export class EventBus {
  #listeners = new Map();   // Map<string, Set<Function>>

  on(eventName, listener)  { /* 返回取消订阅函数 */ }
  off(eventName, listener) { /* 移除监听 */ }
  emit(eventName, payload) { /* 发布 */ }
  clear()                  { /* 清空所有监听 */ }
}
```

**规则**：
- 事件名采用 `namespace:event` 格式：
  - `viewport:zoom-changed` — 缩放变化
  - `canvas:background-changed` — 背景变更
  - `canvas:resized` — 尺寸变更
  - `history:changed` — 撤销/重做状态变更
  - `image:added` — 图片添加完成
  - `viewport:transform-end` — 变换结束
  - `viewport:zoom-source` — 缩放来源
- `on()` 返回取消订阅函数，方便在 `destroy()` 中清理
- `emit()` 内部 try/catch 保护，单个监听器异常不影响其他

### 4.7 插件系统（模板方法模式）

```js
export class PluginManager {
  #plugins = new Map();

  register(plugin)    { /* 校验 id，不允许重复注册 */ }
  bootstrap(context)  { /* 按依赖顺序初始化 */ }
  get(id)             { /* 查询插件 */ }
  destroy()           { /* 逆序销毁 */ }

  #getSortedPlugins() { /* 拓扑排序 */ }
}
```

**插件必须实现**：
- `get id()` — 唯一标识（字符串）
- `get name()` — 显示名称
- `get dependencies()` — 依赖插件 ID 列表（数组）
- `bootstrap(context)` — 初始化，接收 `{ leafer, stage, contentLayer, eventBus, state }`
- `destroy()` — 清理资源

**插件通信规则**：
- 插件之间不直接调用，通过 EventBus 收发事件
- 插件通过 `context.contentLayer` 添加元素到画布
- 插件通过 `context.state` 读取编辑器状态（只读）

---

## 五、工具函数编写规范

### 5.1 归一化函数模式

所有外部输入必须通过归一化函数处理，合并默认值：

```js
/**
 * 归一化图片配置。
 * @param {Object} [image={}] — 外部传入
 * @param {Object} [baseImage={}] — 默认值
 * @returns {Object}
 */
export function normalizeImageOptions(image = {}, baseImage = {}) {
  return {
    ...baseImage,
    ...(image ?? {})
  };
}
```

### 5.2 工具文件规则

- 所有工具函数必须是纯函数（无副作用、无 `this`）
- 放在 `utils/` 目录下，按功能拆文件（`number.js`、`image.js`、`view.js` 等）
- 禁止工具函数引用上层模块（如 `plugins/`、`core/`）
- 使用 JSDoc 标注参数和返回值类型

---

## 六、场景树布局规则

LeaferJS 的场景树布局必须严格遵循：

```
Leafer (leafer)
├── area (Group)      ← 直接挂在 leafer，不参与缩放
│   ├── background    ← 背景色矩形
│   ├── minorGrid     ← 细网格线 Path
│   └── majorGrid     ← 粗网格线 Path
└── stage (Group)     ← 参与缩放（通过 stage.scale）
    └── contentLayer  ← 所有用户内容
```

**关键规则**：
- `area` 不挂在 `stage` 下，网格线在缩放时保持固定视觉宽度
- `contentLayer` 挂在 `stage` 下，内容跟随缩放
- 插件通过 `context.contentLayer` 添加元素，不需要知道 stage 存在
- 缩放时只改 `stage.scale`，网格线通过 `updateArea()` 独立更新

---

## 七、开发工作流

### 7.1 新增插件

1. 在 `plugins/feature-plugins/` 下创建插件目录
2. 插件类实现 `id/name/dependencies/bootstrap/destroy`
3. 在 `plugins/index.js` 中注册
4. 通过 `EventBus` 与其他模块通信
5. 通过 `context.contentLayer` 添加渲染元素

### 7.2 新增命令

1. 在 `commands/canvas/` 下创建命令类
2. 继承 `Command`，实现 `execute()` 和 `undo()`
3. 通过 `editor.execute(new XxxCommand(...))` 使用
4. 如需合并相邻操作，重写 `merge()` 方法

### 7.3 新增缩放策略

1. 在 `viewport/strategies/` 下创建策略类
2. 实现 `handle(data, config)` 返回 `{ scale, anchorX, anchorY } | null`
3. 在 `ViewportManager` 构造函数中注册

### 7.4 修改默认配置

编辑 `config/index.js` 中的 `DEFAULT_CANVAS_CONFIG`，然后确保 `utils/options.js` 中的归一化函数正确合并默认值。

---

## 八、禁止事项

1. **禁止跨层引用** — `utils/` 不能引用 `plugins/` 或 `core/`
2. **禁止直接修改 state** — 必须通过 `state.proxy` 赋值
3. **禁止空 catch 块** — 至少 `console.warn`
4. **禁止插件间直接调用** — 必须通过 EventBus
5. **禁止 `export default`** — 除非入口文件聚合导出
6. **禁止绕过归一化函数直接使用外部参数** — 所有 `options` 必须经过 normalize
7. **禁止在 `index.js` 中写业务逻辑** — 入口只负责导出和工厂函数
8. **禁止操作原生 DOM** — 必须通过 `utils/dom.js` 封装
