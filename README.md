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

---

## 模块划分
1. **UI 层（渲染进程）**
   - 用例列表页：CRUD 测试用例
   - 场景/流程页：把多个用例串起来（可做简单条件/延时）
   - 执行结果页：查看历史执行记录、展开请求/响应
2. **API 层（渲染进程 or 主进程转发）**
   - 登录鉴权：`POST /login` → 保存 token
   - 用例管理：`GET/POST/PUT/DELETE /cases`
   - 场景执行：`POST /runs` → 返回 runId
   - 结果查询：`GET /runs/{id}`
3. **调度层（可放主进程）**
   - 定时任务（node-schedule / cron）
   - IPC 通知渲染进程刷新结果

---

## 与远端的交互约定
> 没有现成文档，用抓包得到的接口来补全这里的路径和字段。

- 统一在 Axios 请求拦截器里加上 `Authorization: Bearer <token>`。
- 统一超时、统一错误弹窗。
- 所有写操作（新增用例、执行场景）都走 POST。
- 执行是两步：
  1. `POST /runs` 提交执行（参数：用例ID或场景ID、环境变量）
  2. 轮询 `GET /runs/{id}` 拿执行状态和详细日志

---

## 数据模型（示意）
```json
// TestCase
{
  "id": "case_1",
  "name": "登录接口",
  "method": "POST",
  "url": "/auth/login",
  "headers": { "Content-Type": "application/json" },
  "body": { "name": "admin", "pwd": "123456" },
  "asserts": [
    { "type": "status", "expect": 200 },
    { "type": "jsonPath", "path": "$.token", "expect": "NOT_EMPTY" }
  ]
}
```

```json
// TestFlow / Scenario
{
  "id": "flow_1",
  "name": "下单流程",
  "steps": [
    { "type": "case", "caseId": "login", "save": { "token": "$.token" } },
    { "type": "case", "caseId": "createOrder", "use": { "Authorization": "Bearer {{token}}" } }
  ]
}
```

---

## UI 结构输出规范
在向 AI 工具描述或生成界面结构时，固定使用下面的区域命名和层次：

1. **appHeader / topBar**
   - 放应用标题、当前 workspace、环境选择器、全局搜索、运行/保存按钮
   - 参考 Material 的 top app bar 或 Fluent 的 command bar 做层级和图标布局
2. **sideNav / navigationPane**
   - 左侧垂直导航，用来显示 API collections、environments、test suites
   - 结构类似 Navigation Drawer / NavigationView
3. **workbench / mainContent**
   - 中间主工作区
   - 顶部有 tabs，每个 tab 对应一个 request 或一个测试用例
   - tab 内部再分成上下两个 panel
4. **requestEditor (upper panel)**
   - 包含 method dropdown、URL textField
   - 下方是分栏 tabs：Params / Auth / Headers / Body / Tests
5. **responsePanel (lower panel)**
   - 显示本次调用的响应：Body / Preview / Headers / Console log
6. **statusBar / footer**
   - 底部细栏，显示远端测试服务连接状态、当前用户、最近一次执行时间

额外约束：
- 保持以上英文名称，不要自动翻译
- 输出 UI 结构时使用树状结构或 JSON，并以这些区域名作为 key
- 涉及按钮或表单元件时使用通用控件名（button、dropdown、textField、tabs、table）
- 优先遵循 Material layout 和 Fluent UI 的区域划分规则
