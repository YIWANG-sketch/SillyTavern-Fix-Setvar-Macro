# Fix Setvar Macro Extension

## 功能说明

此扩展用于修复 SillyTavern staging 分支中 `setvar` 系列宏的管道符 `|` 解析问题。

### 问题背景

在 SillyTavern staging 分支中，`MacroLexer.js` 会将所有 `|` 字符识别为过滤器管道符，导致以下宏无法正常工作：

```
{{setvar::name::|value|}}
```

`|` 会被错误解析为管道符分隔符，而不是值的一部分。

### 解决方案

此扩展会自动将宏中的 `|` 转义为 `\|`，使其不被识别为管道符：

```
{{setvar::name::\|value\|}}
```

## 支持的宏

- `{{setvar::...}}`
- `{{setglobalvar::...}}`
- `{{addvar::...}}`
- `{{addglobalvar::...}}`

## 使用方法

1. 扩展会在 SillyTavern 启动时自动加载
2. 在 **Extensions** → **Extension Settings** 中找到 **Fix Setvar Macro** 设置面板
3. 勾选 **启用自动修复** 复选框（默认已启用）
4. 扩展会在以下场景自动修复宏：
   - **提示词管理器**：在编辑提示词时，当你点击保存或离开输入框时自动转义
   - **聊天消息**：在生成开始前、接收新消息、编辑消息、切换聊天时自动修复

## 工作原理

### 提示词管理器修复

1. 监听提示词编辑表单的出现
2. 在 textarea 失去焦点（blur）时自动转义管道符
3. 用户保存时，文件中存储的就是正确的格式

### 聊天消息修复

1. 监听多个事件（`GENERATION_STARTED`、`MESSAGE_RECEIVED`、`MESSAGE_EDITED`、`CHAT_CHANGED`）
2. 遍历所有聊天消息（包括 swipes）
3. 使用正则表达式查找目标宏
4. 将未转义的 `|` 替换为 `\|`
5. 更新消息内容

## 文件结构

```
fix-setvar-macro/
├── index.js          # 主逻辑
├── settings.html     # 设置界面
└── README.md         # 说明文档
```

## 技术细节

- 使用 `MutationObserver` 监听提示词编辑表单的出现
- 使用 `blur` 事件在用户离开输入框时自动修复
- 使用 `eventSource.makeFirst()` 确保在宏处理前执行
- 智能检测前置反斜杠，避免重复转义
- 设置会自动保存到 `context.extensionSettings`
- 支持实时开关，无需重启

## 调试

在设置面板中启用 **调试模式**，然后打开浏览器控制台，查看详细日志：

```
✓ FSM:INFO Extension ready! Monitoring for setvar macros...
🔍 FSM:DEBUG [Prompt Manager] Edit form detected, attaching handler
🔍 FSM:DEBUG [Prompt Manager] Auto-fixed pipes in prompt textarea
🔍 FSM:DEBUG [Event: GENERATION_STARTED] Fixed 2 message(s)
```

日志级别：

- `✓ FSM:INFO` - 重要操作（扩展启用/禁用、修复成功）
- `🔍 FSM:DEBUG` - 详细调试信息（仅在调试模式下显示）
- `⚠ FSM:WARN` - 警告信息

## 兼容性

- 适用于 SillyTavern staging 分支
- 不影响其他宏和过滤器的正常使用
- 可以随时通过设置面板禁用
