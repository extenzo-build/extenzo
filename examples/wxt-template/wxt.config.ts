import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    name: "Vue Extension Template (WXT)",
    description: "Vue template with popup, options, content, background",
    permissions: ["storage", "activeTab"],
  },
});
