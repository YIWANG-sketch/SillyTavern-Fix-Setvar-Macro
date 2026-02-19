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

此扩展使用 **占位符替换** 方案：

1. **PreProcessor（setvar 阶段）**：将 `|` 替换为 Unicode 私有区占位符

   ```
   {{setvar::name::|value|}}  →  {{setvar::name::〈PIPE〉value〈PIPE〉}}
   ```

2. **PostProcessor（getvar 阶段）**：将占位符还原为 `|`
   ```
   {{getvar::name}}  →  读取 "〈PIPE〉value〈PIPE〉"  →  输出 "|value|"
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
4. 扩展会在所有宏处理前自动修复管道符

## 工作原理

扩展使用 SillyTavern 官方的 **MacroEngine Processor API**：

### PreProcessor（优先级 0）

- 在宏解析前运行
- 扫描所有 `setvar`、`setglobalvar`、`addvar`、`addglobalvar` 宏
- 将参数中的 `|` 替换为 Unicode 私有区占位符（`\u{E000}PIPE\u{E001}`）
- 原生 setvar 可以正常处理不含 `|` 的参数

### PostProcessor（优先级 1000）

- 在宏求值后运行
- 扫描所有输出文本
- 将占位符还原为 `|`
- 用户最终看到的是正确的 `|` 字符

### 优势

- **完全兼容**：不修改原生 setvar 行为，只是预处理输入
- **零侵入**：使用官方 API，不修改核心代码
- **高性能**：占位符检测使用 `String.includes()`，O(n) 复杂度
- **无冲突**：使用 Unicode 私有区字符，不会与用户内容冲突
- **可靠性高**：PreProcessor 和 PostProcessor 配对工作，确保数据完整性

## 调试

在设置面板中启用 **调试模式**，然后打开浏览器控制台，查看详细日志：

```
✓ FSM:INFO Extension ready! Using PreProcessor (setvar) + PostProcessor (getvar).
✓ FSM:INFO [Processors] Registered PreProcessor and PostProcessor
🔍 FSM:DEBUG [PreProcessor] Fixed setvar at position 123
🔍 FSM:DEBUG   Original: {{setvar::name::value|with|pipes}}
🔍 FSM:DEBUG   Fixed:    {{setvar::name::value〈PIPE〉with〈PIPE〉pipes}}
🔍 FSM:DEBUG [PreProcessor] Fixed 1 macro(s) in 0.15ms
🔍 FSM:DEBUG [PostProcessor] Restored 2 pipe(s) in 0.05ms
```

日志级别：

- `✓ FSM:INFO` - 重要操作（扩展启用/禁用、处理器注册）
- `🔍 FSM:DEBUG` - 详细调试信息（仅在调试模式下显示）
- `⚠ FSM:WARN` - 警告信息

## 兼容性

- 适用于 SillyTavern staging 分支
- 不影响其他宏和过滤器的正常使用
- 可以随时通过设置面板禁用
