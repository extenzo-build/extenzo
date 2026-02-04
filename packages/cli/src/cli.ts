#!/usr/bin/env node
import { resolve } from "path";
import { existsSync } from "fs";
import { runPipeline } from "./pipeline.ts";
import { wrapExtenzoOutput } from "./prefixStream.ts";
import { zipDist } from "./zipDist.ts";
import { exitWithError, createConfigNotFoundError, CONFIG_FILES } from "@extenzo/core";

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
    await rsbuild.build({ watch: true });
  } else {
    await rsbuild.build();
    await ctx.config.hooks?.afterBuild?.(ctx);
    if (ctx.config.zip !== false) {
      const zipPath = await zipDist(ctx.distPath, ctx.root, ctx.config.outDir);
      console.log(`Zipped output to ${zipPath}`);
    }
  }
}

main().catch((e) => exitWithError(e));
