import { saveSettingsDebounced } from "../../../../script.js";
import {
  extension_settings,
  getContext,
  renderExtensionTemplateAsync,
} from "../../../extensions.js";
import { MacroEngine } from "../../../macros/engine/MacroEngine.js";

const MODULE_NAME = "third-party/SillyTavern-Fix-Setvar-Macro";
const MACROS_TO_FIX = ["setvar", "setglobalvar", "addvar", "addglobalvar"];

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

function escapePipesPreProcessor(text, env) {
  if (!extensionSettings.enabled) {
    return text;
  }

  const startTime = performance.now();
  let result = text;
  let totalFixed = 0;

  for (const macroName of MACROS_TO_FIX) {
    const regex = new RegExp(
      `\\{\\{${macroName}::((?:[^}]|\\}(?!\\}))*)\\}\\}`,
      "gi",
    );

    result = result.replace(regex, (match, args, offset) => {
      let unescapedPipes = 0;
      let escapedArgs = args;
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
            unescapedPipes++;
            escapedArgs =
              escapedArgs.slice(0, i + (unescapedPipes - 1)) +
              "\\" +
              escapedArgs.slice(i + (unescapedPipes - 1));
            i++;
          }
        }
        i++;
      }

      if (unescapedPipes > 0) {
        totalFixed++;
        const fixed = `{{${macroName}::${escapedArgs}}}`;

        debugLog(`[PreProcessor] Fixed ${macroName} at position ${offset}`);
        debugLog(`  Original: ${match}`);
        debugLog(`  Fixed:    ${fixed}`);
        debugLog(`  Pipes escaped: ${unescapedPipes}`);

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

let registeredPreProcessor = null;

function registerPreProcessor() {
  if (registeredPreProcessor) {
    debugLog('[PreProcessor] Already registered, skipping');
    return;
  }

  if (!MacroEngine) {
    warnLog('[PreProcessor] MacroEngine not available, cannot register');
    return;
  }

  MacroEngine.addPreProcessor(escapePipesPreProcessor, {
    priority: 0,
    source: MODULE_NAME,
  });

  registeredPreProcessor = escapePipesPreProcessor;
  infoLog('[PreProcessor] Registered with MacroEngine (priority=0)');
}

function unregisterPreProcessor() {
  if (!registeredPreProcessor) {
    debugLog('[PreProcessor] Not registered, skipping');
    return;
  }

  if (!MacroEngine) {
    warnLog('[PreProcessor] MacroEngine not available, cannot unregister');
    return;
  }

  const removed = MacroEngine.removePreProcessor(registeredPreProcessor);
  
  if (removed) {
    infoLog('[PreProcessor] Unregistered from MacroEngine');
  } else {
    warnLog('[PreProcessor] Failed to unregister (not found in MacroEngine)');
  }

  registeredPreProcessor = null;
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
    registerPreProcessor();
    infoLog("Extension enabled");
  } else {
    unregisterPreProcessor();
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
    console.log(`${DEBUG_PREFIX} Supported macros:`, MACROS_TO_FIX);
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
    registerPreProcessor();
  }

  infoLog("Extension ready! Using MacroEngine PreProcessor hook.");

  if (extensionSettings.debug) {
    console.log(`${DEBUG_PREFIX} ========================================`);
    console.log(`${DEBUG_PREFIX} Debug mode is active`);
    console.log(`${DEBUG_PREFIX} Filter console with: "FSM:DEBUG"`);
    console.log(`${DEBUG_PREFIX} ========================================`);
  }
});
