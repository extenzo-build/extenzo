import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";

export default defineConfig({
  manifest: {
    name: "WXT Extension Template",
    description: "WXT template with popup, options, content, background",
    permissions: ["storage", "activeTab"],
    host_permissions: ["<all_urls>"],
  },
  analysis: {
    enabled: true,
    outputFile: ".output/report/stats.html",
  },
  vite: () => ({
    plugins: [react()],
  }),
});
