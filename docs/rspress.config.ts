import { defineConfig } from "@rspress/core";

export default defineConfig({
  root: ".",
  lang: "zh",
  route: {
    exclude: ["config/**", "guide/**", "advanced/**", "packages/**"],
  },
  locales: [
    {
      lang: "zh",
      label: "简体中文",
      title: "Extenzo",
      description: "基于 Rsbuild 的浏览器扩展开发框架",
    },
    {
      lang: "en",
      label: "English",
      title: "Extenzo",
      description: "Browser extension development framework built on Rsbuild",
    },
  ],
  icon: "/extenzo.png",
  logo: { light: "/extenzo.png", dark: "/extenzo.png" },
  themeConfig: {
    socialLinks: [
      { icon: "github", mode: "link", content: "https://github.com/extenzo-build/extenzo" },
    ],
    editLink: {
      docRepoBaseUrl: "https://github.com/extenzo-build/extenzo/tree/main/docs",
    },
  },
  i18nSource: {
    editLinkText: {
      zh: "编辑此页",
      en: "Edit this page",
    },
  },
  markdown: { showLineNumbers: true },
  head: [
    [
      "meta",
      {
        name: "keywords",
        content: "browser extension, chrome extension, firefox, rsbuild, extenzo",
      },
    ],
  ],
});
