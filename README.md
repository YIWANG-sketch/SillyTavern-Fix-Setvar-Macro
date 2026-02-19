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

此扩展使用 **MacroEngine PreProcessor Hook** 在宏解析前自动转义管道符：

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
4. 扩展会在所有宏处理前自动修复管道符

## 工作原理

扩展使用 SillyTavern 官方的 **MacroEngine PreProcessor API**：

1. 在扩展加载时，通过 `MacroEngine.addPreProcessor()` 注册预处理器
2. 预处理器在宏解析前运行（priority=0，最高优先级）
3. 使用正则表达式查找目标宏
4. 智能检测未转义的 `|` 字符（通过计算前置反斜杠数量）
5. 将未转义的 `|` 替换为 `\|`
6. 返回修复后的文本给宏引擎

### 优势

- **源头修复**：在宏解析前处理，覆盖所有场景
- **官方 API**：使用 MacroEngine 提供的标准 hook 机制
- **零侵入**：不修改核心代码，不监听 DOM 事件
- **高性能**：只在宏处理时运行，无额外开销
- **可靠性高**：避免了事件监听的时序问题

## 文件结构

```
fix-setvar-macro/
├── index.js          # 主逻辑
├── settings.html     # 设置界面
├── manifest.json     # 扩展配置
└── README.md         # 说明文档
```

## 技术细节

- 使用 `MacroEngine.addPreProcessor()` 注册预处理器
- 优先级设置为 0（最高优先级，在其他预处理器前运行）
- 智能检测前置反斜杠，避免重复转义
- 支持动态启用/禁用（通过 `removePreProcessor()` 注销）
- 设置会自动保存到 `context.extensionSettings`

## 调试

在设置面板中启用 **调试模式**，然后打开浏览器控制台，查看详细日志：

```
✓ FSM:INFO Extension ready! Using MacroEngine PreProcessor hook.
✓ FSM:INFO [PreProcessor] Registered with MacroEngine (priority=0)
🔍 FSM:DEBUG [PreProcessor] Fixed setvar at position 123
🔍 FSM:DEBUG   Original: {{setvar::name::value|with|pipes}}
🔍 FSM:DEBUG   Fixed:    {{setvar::name::value\|with\|pipes}}
🔍 FSM:DEBUG   Pipes escaped: 2
🔍 FSM:DEBUG [PreProcessor] Fixed 1 macro(s) in 0.15ms
```

日志级别：

- `✓ FSM:INFO` - 重要操作（扩展启用/禁用、预处理器注册）
- `🔍 FSM:DEBUG` - 详细调试信息（仅在调试模式下显示）
- `⚠ FSM:WARN` - 警告信息

## 兼容性

- 适用于 SillyTavern staging 分支
- 不影响其他宏和过滤器的正常使用
- 可以随时通过设置面板禁用
