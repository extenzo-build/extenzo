import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["__tests__/**/*.test.ts", "__tests__/**/*.spec.ts"],
  exclude: { patterns: ["**/node_modules/**", "**/dist/**"] },
  testEnvironment: "node",
  root: process.cwd(),
  coverage: {
    enabled: true,
    include: ["src/**/*.ts"],
    exclude: ["**/cli.ts"],
    reporters: [["text", { skipFull: true }], "html", "json", "lcov"],
    reportsDirectory: "./coverage",
    thresholds: { statements: 71, branches: 55, functions: 68, lines: 74 },
  },
});
