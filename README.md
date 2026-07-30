<!--
 * @Author: zzx 452436275@qq.com
 * @Date: 2026-05-12 17:53:58
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-07-30 16:45:14
 * @FilePath: /ele-editor-v2/README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
node 22
https://ele-editor-v2.ele007.com

https://www.leaferjs.com/

┌─────────────────────────────────────────────────────┐
│                    命令层 (Command)                  │
│  - 封装所有编辑操作（添加/删除/变换/滤镜等）          │
│  - 支持撤销/重做、命令合并                            │
└─────────────────────────┬───────────────────────────┘
                          │ 调用
                          ▼
┌─────────────────────────────────────────────────────┐
│                    数据层 (Store)                    │
│  - 不可变全局状态（画布、图层树、选区、历史配置）      │
│  - 发布-订阅机制，通知变化                           │
└─────────────────────────┬───────────────────────────┘
                          │ 订阅
                          ▼
┌─────────────────────────────────────────────────────┐
│                  渲染同步层 (Renderer)               │
│  - 监听 Store 变化，增量更新 Leafer 元素              │
│  - 将 Leafer 交互事件（拖拽/缩放）转换为命令          │
└─────────────────────────┬───────────────────────────┘
                          │ 操作
                          ▼
┌─────────────────────────────────────────────────────┐
│                   引擎层 (Leafer)                    │
│  - Leafer 应用实例 + Editor 插件                     │
│  - 提供画布渲染、图形变换、事件系统                   │
└─────────────────────────────────────────────────────┘

canvas-editor-core/
├── src/
│   ├── index.ts                      # 编辑器主类（对外 API）
│   │
│   ├── core/
│   │   ├── Editor.ts                 # 聚合 Store、CommandManager、Renderer，提供 use() 插件方法
│   │   ├── Store.ts                  # 不可变状态管理 + 发布订阅
│   │   ├── CommandManager.ts         # 撤销/重做栈
│   │   └── Renderer.ts               # 渲染器接口定义
│   │
│   ├── commands/                     # 所有内置命令
│   │   ├── base/
│   │   │   └── ICommand.ts           # 命令接口
│   │   ├── layer/
│   │   │   ├── AddLayerCommand.ts
│   │   │   ├── RemoveLayerCommand.ts
│   │   │   ├── MoveLayerCommand.ts
│   │   │   ├── ResizeLayerCommand.ts
│   │   │   └── RotateLayerCommand.ts
│   │   ├── properties/
│   │   │   ├── UpdateFillCommand.ts
│   │   │   ├── UpdateOpacityCommand.ts
│   │   │   └── UpdateTextCommand.ts
│   │   ├── filter/
│   │   │   └── ApplyFilterCommand.ts
│   │   └── selection/
│   │       └── SelectLayerCommand.ts
│   │
│   ├── store/                        # 数据模型与状态定义
│   │   ├── state.ts                  # EditorState 接口定义
│   │   ├── layer.ts                  # Layer 及其子类型（RectLayer, ImageLayer...）
│   │   └── mutations.ts              # 辅助更新函数（如 updateLayerById）
│   │
│   ├── renderers/                    # 具体渲染引擎实现
│   │   └── leafer/
│   │       ├── LeaferRenderer.ts     # 实现 Renderer 接口，同步 Store 到 Leafer
│   │       ├── nodeFactory.ts        # 根据 Layer 类型创建 Leafer 节点（Rect, Image, Text...）
│   │       └── eventBridge.ts        # 监听 Leafer 的变换事件，生成对应 Command
│   │
│   ├── plugins/                      # 插件系统
│   │   ├── PluginContext.ts          # 提供给插件的 API 上下文
│   │   ├── PluginManager.ts          # 注册/卸载插件
│   │   └── builtin/                  # 内置插件示例
│   │       ├── basicShapes.ts        # 注册矩形、圆形等命令
│   │       └── imageFilters.ts       # 注册滤镜命令
│   │
│   ├── utils/                        # 工具函数
│   │   ├── geometry.ts               # 坐标变换、碰撞检测
│   │   ├── id.ts                     # 生成唯一 ID
│   │   ├── immer.ts                  # 不可变辅助（如 produce）
│   │   └── diff.ts                   # 状态变更差异计算（优化增量同步）
│   │
│   └── types/                        # 全局类型声明
│       ├── global.d.ts
│       └── leafer.d.ts               # LeaferJS 类型扩展
│
├── tests/                            # 单元测试
├── package.json
└── tsconfig.json

https://ele-editor-v2.ele007.com

## 百家信
https://ele-editor-v2.ele007.com/#/h5-page/hundred-family-surnames?productInfoId=2822&skuId=538&skuCustomId=2277&templateId=111&quantity=1&flowId=custom-1785398734264-uzd886sy&seriesType=1&aiSubjectIds=&themeFlowId=custom-1785398734264-uzd886sy&redirectPath=%252FsubPackage2%252Fcustom-order%252Fcallback%253FflowId%253Dcustom-1785398734264-uzd886sy%2526source%253DSERIES&token=eyJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsIm9wZW5pZCI6Im9MS1VpNDUtQThFQ21wVWpON0hYOVF6dlFqY0kiLCJjcmVkZW50aWFsc05vbkV4cGlyZWQiOnRydWUsIm1vYmlsZSI6Im9MS1VpNDUtQThFQ21wVWpON0hYOVF6dlFqY0kiLCJhdmF0YXIiOiJodHRwczovL2VsZS1haWtldGllLmVsZTAwNy5jb20veWlueGlhbmcvMjAyNjA0L2M3ZGYyOGEyLTgxY2ItNDEwYi1hZjVlLTEyMGJhZDZhM2VhNy5qcGVnIiwiZW5hYmxlZCI6ZmFsc2UsImxhc3RMb2dpblRpbWUiOjE3ODQ4NjQ0Nzg5NTIsImNyZWF0ZVRpbWUiOjE3NjIxMzk1MTgwMDAsIm5pY2tuYW1lIjoi55So5oi377yaNjY2OSIsImFjY291bnROb25FeHBpcmVkIjp0cnVlLCJpZCI6MjEsImFjY291bnROb25Mb2NrZWQiOnRydWUsInVzZXJuYW1lIjoib0xLVWk0NS1BOEVDbXBVak43SFg5UXp2UWpjSSIsInN1YiI6Im9MS1VpNDUtQThFQ21wVWpON0hYOVF6dlFqY0kiLCJpYXQiOjE3ODQ4NjQ0NzgsImV4cCI6MTg1Njg2NDQ3OH0.7EtJP59RC7hS7o50jd38RmfFe5FBRffbNbB9fARV_YM
