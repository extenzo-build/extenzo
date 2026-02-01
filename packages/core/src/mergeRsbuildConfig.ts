import type { RsbuildConfig } from "@rsbuild/core";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep-merge user rsbuildConfig into base.
 * plugins arrays are concatenated (base.plugins then user.plugins); other keys deep-merge with user winning.
 */
export function mergeRsbuildConfig(
  base: RsbuildConfig,
  user: RsbuildConfig
): RsbuildConfig {
  const result = { ...base };

  for (const key of Object.keys(user) as (keyof RsbuildConfig)[]) {
    const baseVal = (base as Record<string, unknown>)[key];
    const userVal = (user as Record<string, unknown>)[key];
    if (key === "plugins") {
      const basePlugins = Array.isArray(baseVal) ? baseVal : [];
      const userPlugins = Array.isArray(userVal) ? userVal : [];
      (result as Record<string, unknown>)[key] = [...basePlugins, ...userPlugins];
      continue;
    }
    if (isPlainObject(baseVal) && isPlainObject(userVal)) {
      (result as Record<string, unknown>)[key] = mergeRsbuildConfig(
        baseVal as RsbuildConfig,
        userVal as RsbuildConfig
      );
      continue;
    }
    if (userVal !== undefined) {
      (result as Record<string, unknown>)[key] = userVal;
    }
  }

  return result;
}
