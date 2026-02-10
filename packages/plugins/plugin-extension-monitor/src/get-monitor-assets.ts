import htmlTemplate from "./monitor-page.html";
import scriptTemplate from "./monitor-page.js";

const SCRIPT_SRC_PLACEHOLDER = "__MONITOR_SCRIPT_SRC__";
const ENTRY_NAMES_PLACEHOLDER = "__ENTRY_NAMES__";

export function getMonitorPageHtml(scriptSrc: string): string {
  return htmlTemplate.replace(SCRIPT_SRC_PLACEHOLDER, scriptSrc);
}

export function getMonitorPageScript(entryNames: string[]): string {
  if (!scriptTemplate.includes(ENTRY_NAMES_PLACEHOLDER)) {
    throw new Error("[extenzo-monitor] monitor-page.js template missing __ENTRY_NAMES__.");
  }
  const names = entryNames.length > 0 ? entryNames : ["unknown"];
  const replacement = JSON.stringify(names);
  return scriptTemplate.replaceAll(ENTRY_NAMES_PLACEHOLDER, replacement);
}
