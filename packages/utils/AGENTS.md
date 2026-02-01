# AI usage (@extenzo/utils)

## Purpose

Provides a single `browser` API (via webextension-polyfill) in extension scripts (popup, options, sidepanel, content, background) for cross-Chrome/Firefox usage.

## When to use

- In **any extension entry** (popup, options, sidepanel, content, background) that needs `browser.runtime`, `browser.tabs`, `browser.storage`, etc., import the default export from `@extenzo/utils/webextension-polyfill` as `browser`
- Do not depend on `webextension-polyfill` directly; use this package for consistent version and types

## Usage

```ts
import browser from "@extenzo/utils/webextension-polyfill";
browser.runtime.sendMessage({ type: "PING" });
```

## When changing this package

- This package only wraps webextension-polyfill; when upgrading the polyfill, update this package’s dependency and types accordingly.
