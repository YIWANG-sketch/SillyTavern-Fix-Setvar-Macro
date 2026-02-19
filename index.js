import { saveSettingsDebounced } from "../../../../script.js";
import {
  extension_settings,
  getContext,
  renderExtensionTemplateAsync,
} from "../../../extensions.js";
import { MacroEngine } from "../../../macros/engine/MacroEngine.js";

const MODULE_NAME = "third-party/SillyTavern-Fix-Setvar-Macro";
const SET_MACROS = ["setvar", "setglobalvar", "addvar", "addglobalvar"];
const GET_MACROS = ["getvar", "getglobalvar"];

// 使用不太可能与用户内容冲突的占位符
const PIPE_PLACEHOLDER = "\u{E000}PIPE\u{E001}"; // Unicode 私有使用区

let extensionSettings = {
  enabled: true,
  debug: false,
};

const DEBUG_PREFIX = "🔍 FSM:DEBUG";
const INFO_PREFIX = "✓ FSM:INFO";
const WARN_PREFIX = "⚠ FSM:WARN";

function debugLog(...args) {
  if (extensionSettings.debug) {
    console.log(DEBUG_PREFIX, ...args);
  }
}

function infoLog(...args) {
  console.log(INFO_PREFIX, ...args);
}

function warnLog(...args) {
  console.warn(WARN_PREFIX, ...args);
}

/**
 * PreProcessor: 在 setvar 系列宏中，将 | 替换为占位符
 */
function setvarPreProcessor(text, env) {
  if (!extensionSettings.enabled) {
    return text;
  }

  const startTime = performance.now();
  let result = text;
  let totalFixed = 0;

  for (const macroName of SET_MACROS) {
    const regex = new RegExp(
      `\\{\\{${macroName}::((?:[^}]|\\}(?!\\}))*)\\}\\}`,
      "gi",
    );

    result = result.replace(regex, (match, args, offset) => {
      // 检查是否包含未转义的 |
      let hasPipes = false;
      let i = 0;
      while (i < args.length) {
        if (args[i] === "|") {
          let backslashCount = 0;
          let j = i - 1;
          while (j >= 0 && args[j] === "\\") {
            backslashCount++;
            j--;
          }
          if (backslashCount % 2 === 0) {
            hasPipes = true;
            break;
          }
        }
        i++;
      }

      if (hasPipes) {
        // 替换所有未转义的 | 为占位符
        let processedArgs = "";
        let i = 0;
        while (i < args.length) {
          if (args[i] === "|") {
            let backslashCount = 0;
            let j = i - 1;
            while (j >= 0 && args[j] === "\\") {
              backslashCount++;
              j--;
            }
            if (backslashCount % 2 === 0) {
              processedArgs += PIPE_PLACEHOLDER;
            } else {
              processedArgs += args[i];
            }
          } else {
            processedArgs += args[i];
          }
          i++;
        }

        totalFixed++;
        const fixed = `{{${macroName}::${processedArgs}}}`;

        debugLog(`[PreProcessor] Fixed ${macroName} at position ${offset}`);
        debugLog(`  Original: ${match}`);
        debugLog(`  Fixed:    ${fixed}`);

        return fixed;
      }

      return match;
    });
  }

  const duration = (performance.now() - startTime).toFixed(2);

  if (totalFixed > 0) {
    debugLog(`[PreProcessor] Fixed ${totalFixed} macro(s) in ${duration}ms`);
  }

  return result;
}

/**
 * PostProcessor: 在 getvar 系列宏的返回值中，将占位符还原为 |
 */
function getvarPostProcessor(text, env) {
  if (!extensionSettings.enabled) {
    return text;
  }

  // 如果文本中没有占位符，直接返回
  if (!text.includes(PIPE_PLACEHOLDER)) {
    return text;
  }

  const startTime = performance.now();
  const result = text.replaceAll(PIPE_PLACEHOLDER, "|");
  const count = (text.length - result.length) / (PIPE_PLACEHOLDER.length - 1);

  if (count > 0) {
    const duration = (performance.now() - startTime).toFixed(2);
    debugLog(`[PostProcessor] Restored ${count} pipe(s) in ${duration}ms`);
  }

  return result;
}

let registeredPreProcessor = null;
let registeredPostProcessor = null;

function registerProcessors() {
  if (registeredPreProcessor && registeredPostProcessor) {
    debugLog("[Processors] Already registered, skipping");
    return;
  }

  if (!MacroEngine) {
    warnLog("[Processors] MacroEngine not available, cannot register");
    return;
  }

  // 注册 PreProcessor（处理 setvar）
  MacroEngine.addPreProcessor(setvarPreProcessor, {
    priority: 0,
    source: MODULE_NAME,
  });
  registeredPreProcessor = setvarPreProcessor;

  // 注册 PostProcessor（处理 getvar 返回值）
  MacroEngine.addPostProcessor(getvarPostProcessor, {
    priority: 1000, // 较低优先级，让其他处理器先执行
    source: MODULE_NAME,
  });
  registeredPostProcessor = getvarPostProcessor;

  infoLog("[Processors] Registered PreProcessor and PostProcessor");
}

function unregisterProcessors() {
  if (!registeredPreProcessor && !registeredPostProcessor) {
    debugLog("[Processors] Not registered, skipping");
    return;
  }

  if (!MacroEngine) {
    warnLog("[Processors] MacroEngine not available, cannot unregister");
    return;
  }

  if (registeredPreProcessor) {
    MacroEngine.removePreProcessor(registeredPreProcessor);
    registeredPreProcessor = null;
  }

  if (registeredPostProcessor) {
    MacroEngine.removePostProcessor(registeredPostProcessor);
    registeredPostProcessor = null;
  }

  infoLog("[Processors] Unregistered all processors");
}

function loadSettings() {
  const context = getContext();
  if (!context) {
    warnLog("[Settings] No context available");
    return;
  }

  if (!context.extensionSettings) {
    context.extensionSettings = {};
  }

  if (context.extensionSettings[MODULE_NAME]) {
    Object.assign(extensionSettings, context.extensionSettings[MODULE_NAME]);
  }

  $("#fix_setvar_enabled").prop("checked", extensionSettings.enabled);
  $("#fix_setvar_debug").prop("checked", extensionSettings.debug);

  debugLog("[Settings] Loaded:", extensionSettings);
}

function onEnabledChanged() {
  extensionSettings.enabled = $("#fix_setvar_enabled").prop("checked");
  const context = getContext();
  if (!context) {
    warnLog("[Settings] No context available");
    return;
  }

  if (!context.extensionSettings) {
    context.extensionSettings = {};
  }

  context.extensionSettings[MODULE_NAME] = extensionSettings;
  saveSettingsDebounced();

  if (extensionSettings.enabled) {
    registerProcessors();
    infoLog("Extension enabled");
  } else {
    unregisterProcessors();
    infoLog("Extension disabled");
  }
}

function onDebugChanged() {
  extensionSettings.debug = $("#fix_setvar_debug").prop("checked");
  const context = getContext();
  if (!context) {
    warnLog("[Settings] No context available");
    return;
  }

  if (!context.extensionSettings) {
    context.extensionSettings = {};
  }

  context.extensionSettings[MODULE_NAME] = extensionSettings;
  saveSettingsDebounced();
  infoLog(`Debug mode ${extensionSettings.debug ? "enabled" : "disabled"}`);

  if (extensionSettings.debug) {
    console.log(`${DEBUG_PREFIX} ========================================`);
    console.log(`${DEBUG_PREFIX} Debug mode activated!`);
    console.log(`${DEBUG_PREFIX} Filter console with: "FSM:DEBUG"`);
    console.log(`${DEBUG_PREFIX} Current settings:`, extensionSettings);
    console.log(`${DEBUG_PREFIX} Pipe placeholder:`, PIPE_PLACEHOLDER);
    console.log(`${DEBUG_PREFIX} ========================================`);
  }
}

jQuery(async () => {
  infoLog("Extension loading...");

  const settingsHtml = await renderExtensionTemplateAsync(
    MODULE_NAME,
    "settings",
  );
  $("#extensions_settings2").append(settingsHtml);

  loadSettings();

  $("#fix_setvar_enabled").on("change", onEnabledChanged);
  $("#fix_setvar_debug").on("change", onDebugChanged);

  if (extensionSettings.enabled) {
    registerProcessors();
  }

  infoLog(
    "Extension ready! Using PreProcessor (setvar) + PostProcessor (getvar).",
  );

  if (extensionSettings.debug) {
    console.log(`${DEBUG_PREFIX} ========================================`);
    console.log(`${DEBUG_PREFIX} Debug mode is active`);
    console.log(`${DEBUG_PREFIX} Filter console with: "FSM:DEBUG"`);
    console.log(`${DEBUG_PREFIX} ========================================`);
  }
});
