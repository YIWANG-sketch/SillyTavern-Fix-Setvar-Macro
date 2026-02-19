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
{{setvar::name:\|value\|}}
```

## 支持的宏

- `{{setvar::...}}`
- `{{setglobalvar::...}}`
- `{{addvar::...}}`
- `{{addglobalvar::...}}`

## 安装方法

### 方法 1：通过 URL 安装（推荐）

1. 打开 SillyTavern
2. 进入 **Extensions** → **Install Extension**
3. 粘贴以下 URL：
   ```
   https://github.com/YIWANG-sketch/SillyTavern-Fix-Setvar-Macro
   ```
4. 点击 **Install**

### 方法 2：手动安装

1. 下载此仓库的所有文件
2. 将文件放入 `SillyTavern/data/<user>/extensions/fix-setvar-macro/` 目录
3. 重启 SillyTavern

## 使用方法

1. 扩展会在 SillyTavern 启动时自动加载
2. 在 **Extensions** → **Extension Settings** 中找到 **Fix Setvar Macro** 设置面板
3. 勾选 **启用自动修复** 复选框（默认已启用）
4. 扩展会在以下时机自动修复消息中的宏：
   - 生成开始前（最高优先级）
   - 接收到新消息时
   - 编辑消息时
   - 切换聊天时

## 调试功能

扩展提供了详细的调试日志系统：

1. 在设置面板中勾选 **启用详细日志**
2. 打开浏览器控制台（F12）
3. 在控制台筛选框输入 `FSM:DEBUG` 查看详细日志

### 日志级别

- `✓ FSM:INFO` - 重要信息（始终显示）
- `🔍 FSM:DEBUG` - 详细调试信息（仅调试模式）
- `⚠ FSM:WARN` - 警告信息

## 工作原理

1. 监听多个事件（`GENERATION_STARTED`、`MESSAGE_RECEIVED`、`MESSAGE_EDITED`、`CHAT_CHANGED`）
2. 遍历所有聊天消息（包括 swipes）
3. 使用正则表达式查找目标宏
4. 将未转义的 `|` 替换为 `\|`
5. 更新消息内容

## 技术细节

- 使用 `eventSource.makeFirst()` 确保在宏处理前执行
- 使用负向后查找 `(?<!\\)` 避免重复转义
- 设置会自动保存到 `context.extensionSettings`
- 支持实时开关，无需重启

## 兼容性

- 适用于 SillyTavern staging 分支
- 不影响其他宏和过滤器的正常使用
- 可以随时通过设置面板禁用

## 许可证

MIT License
