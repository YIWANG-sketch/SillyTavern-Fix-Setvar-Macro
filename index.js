import { saveSettingsDebounced } from "../../../../script.js";
import { extension_settings } from "../../../extensions.js";

const MODULE_NAME = "fix-setvar-macro";
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

function escapePipesInMacro(text, macroName) {
  const regex = new RegExp(`\\{\\{${macroName}::((?:[^}]|\\}(?!\\}))*)\\}\\}`, "gi");

  let matchCount = 0;
  let fixCount = 0;

  const result = text.replace(regex, (match, args, offset) => {
    matchCount++;

    // Count unescaped pipes by checking preceding backslashes
    let unescapedPipes = 0;
    let escapedArgs = args;
    let i = 0;

    while (i < args.length) {
      if (args[i] === "|") {
        // Count preceding backslashes
        let backslashCount = 0;
        let j = i - 1;
        while (j >= 0 && args[j] === "\\") {
          backslashCount++;
          j--;
        }

        // If even number of backslashes (including 0), pipe is unescaped
        if (backslashCount % 2 === 0) {
          unescapedPipes++;
          // Escape this pipe
          escapedArgs =
            escapedArgs.slice(0, i + (unescapedPipes - 1)) +
            "\\" +
            escapedArgs.slice(i + (unescapedPipes - 1));
          i++; // Skip the backslash we just added
        }
      }
      i++;
    }

    if (unescapedPipes > 0) {
      fixCount++;
      const fixed = `{{${macroName}::${escapedArgs}}}`;

      debugLog(`[Macro Fix] ${macroName} at position ${offset}`);
      debugLog(`  Original: ${match}`);
      debugLog(`  Fixed:    ${fixed}`);
      debugLog(`  Pipes escaped: ${unescapedPipes}`);

      return fixed;
    }

    return match;
  });

  if (matchCount > 0) {
    debugLog(
      `[Regex Match] Macro: ${macroName}, Total matches: ${matchCount}, Fixed: ${fixCount}`,
    );
  }

  return result;
}

function fixMacrosInText(text) {
  if (!text || typeof text !== "string") {
    debugLog("[Text Check] Invalid input:", typeof text);
    return text;
  }

  const startTime = performance.now();
  let result = text;
  let totalChanges = 0;

  debugLog("[Text Processing] Starting, length:", text.length);

  for (const macroName of MACROS_TO_FIX) {
    const before = result;
    result = escapePipesInMacro(result, macroName);
    if (before !== result) {
      totalChanges++;
      debugLog(`[Text Change] Macro ${macroName} modified the text`);
    }
  }

  const duration = (performance.now() - startTime).toFixed(2);

  if (totalChanges > 0) {
    debugLog(
      `[Text Processing] Complete in ${duration}ms, ${totalChanges} macro type(s) fixed`,
    );
    debugLog(
      `[Text Diff] Length: ${text.length} → ${result.length} (${result.length - text.length >= 0 ? "+" : ""}${result.length - text.length})`,
    );
  } else {
    debugLog(`[Text Processing] Complete in ${duration}ms, no changes needed`);
  }

  return result;
}

function fixAllMessages(eventName = "UNKNOWN") {
  if (!extensionSettings.enabled) {
    debugLog(`[Event: ${eventName}] Extension disabled, skipping`);
    return;
  }

  debugLog(`[Event: ${eventName}] ========== Starting message scan ==========`);
  const startTime = performance.now();

  if (!SillyTavern || !SillyTavern.getContext) {
    debugLog(`[Event: ${eventName}] SillyTavern context not ready yet`);
    return;
  }

  const { getContext } = SillyTavern.getContext();
  const context = getContext();
  if (!context || !context.chat) {
    debugLog(`[Event: ${eventName}] No context or chat available`);
    return;
  }

  const chat = context.chat;

  if (chat.length === 0) {
    debugLog(`[Event: ${eventName}] No chat messages found`);
    return;
  }

  debugLog(`[Event: ${eventName}] Chat has ${chat.length} message(s)`);

  let fixedCount = 0;
  let processedMessages = 0;
  let processedSwipes = 0;

  for (let i = 0; i < chat.length; i++) {
    const message = chat[i];
    processedMessages++;

    debugLog(
      `[Message ${i}] Processing message, Role: ${message.is_user ? "user" : "assistant"}`,
    );

    if (message.mes) {
      const original = message.mes;
      const fixed = fixMacrosInText(original);
      if (original !== fixed) {
        message.mes = fixed;
        fixedCount++;
        debugLog(`[Message ${i}] ✓ Main content fixed`);
      } else {
        debugLog(`[Message ${i}] No changes needed in main content`);
      }
    } else {
      debugLog(`[Message ${i}] No main content`);
    }

    if (message.swipes && Array.isArray(message.swipes)) {
      debugLog(`[Message ${i}] Processing ${message.swipes.length} swipe(s)`);
      for (let j = 0; j < message.swipes.length; j++) {
        processedSwipes++;
        const original = message.swipes[j];
        const fixed = fixMacrosInText(original);
        if (original !== fixed) {
          message.swipes[j] = fixed;
          fixedCount++;
          debugLog(`[Message ${i}] ✓ Swipe ${j} fixed`);
        } else {
          debugLog(`[Message ${i}] Swipe ${j} no changes needed`);
        }
      }
    }
  }

  const duration = (performance.now() - startTime).toFixed(2);

  if (fixedCount > 0) {
    infoLog(`[Event: ${eventName}] Fixed ${fixedCount} message(s) in ${duration}ms`);
    debugLog(
      `[Event: ${eventName}] Stats: ${processedMessages} messages, ${processedSwipes} swipes processed`,
    );
  } else {
    debugLog(
      `[Event: ${eventName}] No fixes needed. Processed ${processedMessages} messages, ${processedSwipes} swipes in ${duration}ms`,
    );
  }

  debugLog(`[Event: ${eventName}] ========== Scan complete ==========`);
}

function loadSettings() {
  if (!extension_settings[MODULE_NAME]) {
    extension_settings[MODULE_NAME] = {};
  }

  Object.assign(extensionSettings, extension_settings[MODULE_NAME]);

  $("#fix_setvar_enabled").prop("checked", extensionSettings.enabled);
  $("#fix_setvar_debug").prop("checked", extensionSettings.debug);

  debugLog("[Settings] Loaded:", extensionSettings);
}

function onEnabledChanged() {
  extensionSettings.enabled = $("#fix_setvar_enabled").prop("checked");
  extension_settings[MODULE_NAME] = extensionSettings;
  saveSettingsDebounced();
  infoLog(`Extension ${extensionSettings.enabled ? "enabled" : "disabled"}`);
}

function onDebugChanged() {
  extensionSettings.debug = $("#fix_setvar_debug").prop("checked");
  extension_settings[MODULE_NAME] = extensionSettings;
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

  const { eventSource, event_types, renderExtensionTemplateAsync } =
    SillyTavern.getContext();

  const settingsHtml = await renderExtensionTemplateAsync(
    "third-party/SillyTavern-Fix-Setvar-Macro",
    "settings",
  );
  $("#extensions_settings2").append(settingsHtml);

  loadSettings();

  $("#fix_setvar_enabled").on("change", onEnabledChanged);
  $("#fix_setvar_debug").on("change", onDebugChanged);

  debugLog("[Init] Registering event listeners...");

  eventSource.makeFirst(event_types.GENERATION_STARTED, () => {
    debugLog("[Event Trigger] GENERATION_STARTED");
    fixAllMessages("GENERATION_STARTED");
  });

  eventSource.on(event_types.MESSAGE_RECEIVED, () => {
    debugLog("[Event Trigger] MESSAGE_RECEIVED");
    fixAllMessages("MESSAGE_RECEIVED");
  });

  eventSource.on(event_types.MESSAGE_EDITED, () => {
    debugLog("[Event Trigger] MESSAGE_EDITED");
    fixAllMessages("MESSAGE_EDITED");
  });

  eventSource.on(event_types.CHAT_CHANGED, () => {
    debugLog("[Event Trigger] CHAT_CHANGED");
    fixAllMessages("CHAT_CHANGED");
  });

  debugLog("[Init] Event listeners registered. Extension ready!");

  infoLog("Extension ready! Monitoring for setvar macros...");

  if (extensionSettings.debug) {
    console.log(`${DEBUG_PREFIX} ========================================`);
    console.log(`${DEBUG_PREFIX} Debug mode is active`);
    console.log(`${DEBUG_PREFIX} Filter console with: \"FSM:DEBUG\"`);
    console.log(`${DEBUG_PREFIX} ========================================`);
  }
});
