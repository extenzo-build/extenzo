#!/usr/bin/env node
import { resolve } from "path";
import { existsSync } from "fs";
import { runPipeline } from "./pipeline.ts";
import { wrapExtenzoOutput, getRawWrites } from "./prefixStream.ts";
import { zipDist } from "./zipDist.ts";
import {
  exitWithError,
  createConfigNotFoundError,
  CONFIG_FILES,
  logDone,
  setExoLoggerRawWrites,
} from "@extenzo/core";
import { launchBrowserOnly } from "@extenzo/plugin-extension-hmr";

const root = process.cwd();

function hasConfigFile(): boolean {
  return CONFIG_FILES.some((file) => existsSync(resolve(root, file)));
}

async function main(): Promise<void> {
  if (!hasConfigFile()) throw createConfigNotFoundError(root);

  const argv = process.argv.slice(2);
  const ctx = await runPipeline(root, argv);

  process.env.NODE_ENV = ctx.isDev ? "development" : "production";
  wrapExtenzoOutput();
  setExoLoggerRawWrites(getRawWrites());

  const { createRsbuild } = await import("@rsbuild/core");
  const rsbuild = await createRsbuild({
    rsbuildConfig: ctx.rsbuildConfig,
    cwd: ctx.root,
    loadEnv: {
      cwd: ctx.root,
      prefixes: ctx.config.envPrefix ?? [""],
    },
  });

  if (ctx.command === "dev") {
    await rsbuild.startDevServer();
  } else {
    await rsbuild.build();
    await ctx.config.hooks?.afterBuild?.(ctx);
    if (ctx.config.zip !== false) {
      const zipPath = await zipDist(ctx.distPath, ctx.root, ctx.config.outDir);
      logDone("Zipped output to", zipPath);
    }
    if (ctx.launchRequested) {
      const launch = ctx.config.launch as Record<string, string | undefined> | undefined;
      await launchBrowserOnly({
        distPath: ctx.distPath,
        browser: ctx.launchTarget,
        chromePath: launch?.chrome,
        edgePath: launch?.edge,
        bravePath: launch?.brave,
        vivaldiPath: launch?.vivaldi,
        operaPath: launch?.opera,
        santaPath: launch?.santa,
        firefoxPath: launch?.firefox,
        persist: (ctx as { persist?: boolean }).persist,
      });
    }
  }
}

main().catch((e) => exitWithError(e));
