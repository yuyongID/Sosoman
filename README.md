# 接口测试桌面工具技术方案（给 AI 编程工具的说明）

## 目标
做一个类似 Postman / Apifox 的桌面工具，本地只做 UI 和流程编排，真正的接口测试执行由远端服务器完成（远端基于二开后的 `sosotest`）。本地通过 HTTP API 管理用例、下发执行、拉取结果。

---

## 技术栈
- 桌面壳：Electron
- 前端：React（或 Vue）+ 现成 UI 库（Ant Design / Element）
- 网络请求：Axios（统一封装、拦截器、鉴权）
- 语言：TypeScript 优先

---

## 核心思路
1. **本地不跑测试**：不在 Electron 里真正发被测接口；所有“运行用例/场景”都变成“调用远端测试服务的 API”。
2. **远端是唯一真相**：远端维护用例、环境、执行记录；客户端只是一个可视化控制台。
3. **所有接口统一走一层 SDK**：在前端建 `/src/api/*`，统一封装远端的实际 URL、token、错误处理，便于以后替换/适配抓包到的接口。

## sosotest 接入模式（远端 & Mock）

| 场景 | 触发条件 | 行为 |
| --- | --- | --- |
| 远端模式（默认） | 未显式开启 Mock，或 `SOSOTEST_USE_MOCK=0` | 所有请求直连 `https://at.api.ke.com`，依然可以通过 `SOSOTEST_TOKEN` 等环境变量注入鉴权信息 |
| Mock 模式 | `CI=true/1`、`NODE_ENV=test`，或手动设置 `SOSOTEST_USE_MOCK=1/true` | API 层直接走本地 `src/api/sosotest/mock` 中的内存服务，使用 `doc/interface.postman_collection.json` 里的样例响应复刻出的数据 |

- CI 环境默认会导出 `CI=true`，因此流水线上无需再做额外配置即可自动进入 Mock 模式，实现自检闭环。
- Mock 服务仅读写内存，且不会参与 Electron 打包产物；生产构建始终使用远端接口。

### 本地如何切换

```bash
# 强制启用 Mock，便于无网或离线调试
SOSOTEST_USE_MOCK=1 npm run dev

# 即使在 CI 里也想验证真实后端，可利用显式关闭开关
SOSOTEST_USE_MOCK=0 npm run typecheck
```

Mock 数据入口：
- 接口列表/详情/保存：`src/api/sosotest/mock/fixtures.ts` → `sosotestMockService`
- 调试执行：`sosotestMockService.executeDebugRequest`，返回体与文档 “API 运行 / API 运行轮询查询” 示例保持一致
- 环境列表：`environmentGroups` 样例，覆盖线上、测试两组常用地址

如需调整样例，只需更新上述 fixture 并保持字段与 Postman 文档一致。

---

## 模块划分
1. **UI 层（渲染进程）**
   - 用例列表页：CRUD 测试用例
   - 场景/流程页：把多个用例串起来（可做简单条件/延时）
2. **API 层（渲染进程 or 主进程转发）**
3. **调度层（可放主进程）**
   - 定时任务（node-schedule / cron）
   - IPC 通知渲染进程刷新结果

---

## UI 结构输出规范
在向 AI 工具描述或生成界面结构时，固定使用下面的区域命名和层次：

1. **appHeader**
   - 放应用标题、当前 workspace
   - 参考 Material 的 top app bar 或 Fluent 的 command bar 做层级和图标布局
2. **sideNav**
   - 左侧垂直导航，用来显示 API collections、environments、test suites
   - 结构类似 Navigation Drawer / NavigationView
3. **workbench**
   - 中间主工作区
   - 顶部有 tabs，每个 tab 对应一个 request 或一个测试用例、环境选择器
   - tab 内部再分成上下两个 panel
4. **requestEditor (upper panel)**
   - 包含 method dropdown、URL textField、运行/保存按钮
   - 下方是分栏 tabs：Params / Headers / Body / 前置 / 后置
5. **responsePanel(lower panel)**
   - 显示本次调用的响应：Body / Headers / TestResult
6. **statusBar**
   - 底部细栏，显示远端测试服务连接状态、当前用户、最近一次执行时间、CONSOLE

额外约束：
- 保持以上英文名称，不要自动翻译
- 输出 UI 结构时使用树状结构或 JSON，并以这些区域名作为 key
- 涉及按钮或表单元件时使用通用控件名（button、dropdown、textField、tabs、table）
- 优先遵循 Material layout 和 Fluent UI 的区域划分规则

## 暗色主题规范
- **基底层级**：主背景 `#1f1f24`，appHeader/statusBar 使用更深的 `#1b1b1f`，侧边栏使用略浅的 `#24262b` 以区分区域。
- **内容卡片**：requestEditor/responsePanel 等核心面板采用 `#2a2d33`，输入区使用 `#0f1115`，配合 `rgba(255,255,255,0.04~0.08)` 的细描边。
- **文本与图标**：主文字 `#f3f4f6`，辅助文字 `#9ca3af`，图标和表格线条保持高对比，避免低对比灰阶。
- **品牌色**：按钮、选中态、激活标签统一使用 `#2190FF`（必要时降低不透明度），成功态 `#4ade80`，错误态 `#f87171`。
- **导航与分隔**：sideNav 选中项使用 `rgba(33,144,255,0.15)` 背景 + 细描边，所有分隔线统一使用透明浅色确保暗色模式克制。
