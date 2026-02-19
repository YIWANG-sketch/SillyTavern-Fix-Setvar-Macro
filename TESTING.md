# Fix Setvar Macro Extension - 测试指南

## 快速测试

### 1. 基础功能测试

在 SillyTavern 中发送包含以下宏的消息：

```
{{setvar::test::|value with pipes|}}
{{setglobalvar::global::|another|value|}}
{{addvar::counter::|increment|}}
{{addglobalvar::total::|add|this|}}
```

**预期结果：**

- 控制台显示：`✓ FSM:INFO Fixed 1 message(s) in Xms`
- 宏中的 `|` 被转义为 `\|`

### 2. 调试模式测试

1. 打开 **Extensions** → **Extension Settings** → **Fix Setvar Macro**
2. 勾选 **启用详细日志**
3. 在控制台输入：`FSM:DEBUG` 进行筛选
4. 发送包含宏的消息

**预期输出：**

```
🔍 FSM:DEBUG ========================================
🔍 FSM:DEBUG Debug mode activated!
🔍 FSM:DEBUG Filter console with: "FSM:DEBUG"
🔍 FSM:DEBUG Current settings: {enabled: true, debug: true}
🔍 FSM:DEBUG Supported macros: ['setvar', 'setglobalvar', 'addvar', 'addglobalvar']
🔍 FSM:DEBUG ========================================
🔍 FSM:DEBUG [Event Trigger] MESSAGE_RECEIVED
🔍 FSM:DEBUG [Event: MESSAGE_RECEIVED] ========== Starting message scan ==========
🔍 FSM:DEBUG [Event: MESSAGE_RECEIVED] Chat has 5 message(s)
🔍 FSM:DEBUG [Message 0] Processing message, Role: user
🔍 FSM:DEBUG [Text Processing] Starting, length: 45
🔍 FSM:DEBUG [Macro Fix] setvar at position 0
🔍 FSM:DEBUG   Original: {{setvar::test::|value|}}
🔍 FSM:DEBUG   Fixed:    {{setvar::test:\|value\|}}
🔍 FSM:DEBUG   Pipes escaped: 2
🔍 FSM:DEBUG [Regex Match] Macro: setvar, Total matches: 1, Fixed: 1
🔍 FSM:DEBUG [Text Change] Macro setvar modified the text
🔍 FSM:DEBUG [Text Processing] Complete in 0.15ms, 1 macro type(s) fixed
🔍 FSM:DEBUG [Text Diff] Length: 45 → 47 (+2)
🔍 FSM:DEBUG [Message 0] ✓ Main content fixed
✓ FSM:INFO [Event: MESSAGE_RECEIVED] Fixed 1 message(s) in 1.23ms
🔍 FSM:DEBUG [Event: MESSAGE_RECEIVED] Stats: 5 messages, 0 swipes processed
🔍 FSM:DEBUG [Event: MESSAGE_RECEIVED] ========== Scan complete ==========
```

### 3. 性能测试

测试大量消息的处理性能：

1. 打开包含 100+ 消息的聊天
2. 观察控制台输出的处理时间
3. 验证没有明显的性能影响

**预期：**

- 处理时间 < 50ms（100 条消息）
- 无 UI 卡顿

### 4. 边界情况测试

测试以下特殊情况：

```
# 已转义的管道符（不应重复转义）
{{setvar::test:\|already escaped\|}}

# 混合转义和未转义
{{setvar::mixed:\|escaped\| and |unescaped|}}

# 嵌套大括号
{{setvar::nested::{{inner}}|value|}}

# 空值
{{setvar::empty::||}}

# 多个宏在同一消息
{{setvar::a::|1|}} and {{addvar::b::|2|}}
```

## 调试日志说明

### 日志前缀

- `✓ FSM:INFO` - 重要信息（始终显示）
- `🔍 FSM:DEBUG` - 详细调试信息（仅调试模式）
- `⚠ FSM:WARN` - 警告信息

### 关键调试信息

1. **事件触发**
   - `[Event Trigger]` - 显示哪个事件被触发
   - `[Event: XXX]` - 事件处理的详细过程

2. **消息处理**
   - `[Message N]` - 第 N 条消息的处理状态
   - `[Text Processing]` - 文本处理的性能统计

3. **正则匹配**
   - `[Regex Match]` - 正则表达式匹配结果
   - `[Macro Fix]` - 具体的修复操作

4. **性能统计**
   - 处理时间（毫秒）
   - 文本长度变化
   - 处理的消息和 swipes 数量

## 控制台筛选技巧

### Chrome/Edge DevTools

```
FSM:DEBUG    # 只看调试日志
FSM:INFO     # 只看信息日志
FSM:         # 看所有扩展日志
-FSM:DEBUG   # 排除调试日志
```

### Firefox DevTools

在控制台右上角的筛选框输入：`FSM:`

## 常见问题排查

### 问题：宏没有被修复

**检查步骤：**

1. 确认扩展已启用：`✓ FSM:INFO Extension ready!`
2. 开启调试模式查看详细日志
3. 检查是否是支持的宏类型
4. 验证宏语法是否正确

### 问题：性能影响

**检查步骤：**

1. 查看 `[Event: XXX]` 日志中的处理时间
2. 如果 > 100ms，可能是聊天消息过多
3. 考虑临时禁用扩展

### 问题：重复转义

**检查步骤：**

1. 开启调试模式
2. 查看 `[Macro Fix]` 日志
3. 检查 `Pipes escaped` 数量
4. 如果为 0，说明已经转义过了（正常）

## 开发调试

如果需要修改扩展代码：

1. 编辑 `index.js`
2. 刷新 SillyTavern 页面（F5）
3. 查看控制台是否有加载错误
4. 开启调试模式验证修改

## 性能基准

在标准测试环境下（100 条消息，10% 包含目标宏）：

- 初始扫描：< 20ms
- 单次事件处理：< 5ms
- 内存占用：< 1MB
- CPU 影响：可忽略
