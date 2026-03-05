#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import { blue, green, red, yellow, dim } from "kolorist";
import minimist from "minimist";
import { downloadTemplate } from "./download.ts";
import { FRAMEWORKS, LANGUAGES, getTemplateName } from "./templates.ts";
import { detectPackageManager, getInstallCommand, getRunCommand } from "@extenzo/pkg-manager";
import type { Framework, Language } from "./templates.ts";

function getVersion(): string {
  try {
    const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHelp(): void {
  const version = getVersion();
  console.log(`
  create-extenzo-app v${version}

  Create a new extenzo extension project

  Usage:
    create-extenzo-app [project-name] [options]

  Options:
    --framework <name>   Skip prompt: vanilla | vue | react | preact | svelte | solid | uno
    --language  <lang>   Skip prompt: js | ts
    --help               Show this help message
    --version            Show version number
`);
}

async function confirmOverwrite(dir: string): Promise<boolean> {
  const { overwrite } = await prompts({
    type: "confirm",
    name: "overwrite",
    message: `Directory "${dir}" already exists. Overwrite?`,
    initial: false,
  });
  return !!overwrite;
}

async function promptOptions(): Promise<{ framework: Framework; language: Language } | null> {
  const res = await prompts([
    { type: "select", name: "framework", message: "Select a framework", choices: FRAMEWORKS },
    { type: "select", name: "language", message: "Select a language", choices: LANGUAGES },
  ]);
  if (!res.framework || !res.language) return null;
  return { framework: res.framework as Framework, language: res.language as Language };
}

function updatePackageName(destDir: string, projectName: string): void {
  const pkgPath = resolve(destDir, "package.json");
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = projectName.replace(/\s+/g, "-").toLowerCase();
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2));

  if (argv.help || argv.h) {
    printHelp();
    return;
  }

  if (argv.version || argv.v) {
    console.log(getVersion());
    return;
  }

  const targetDir: string = argv._[0] ?? "my-extension";
  const cliFramework = argv.framework as Framework | undefined;
  const cliLanguage = argv.language as Language | undefined;

  console.log(blue("\n  Create Extenzo App\n"));

  const root = resolve(process.cwd(), targetDir);

  if (existsSync(root)) {
    const confirmed = await confirmOverwrite(targetDir);
    if (!confirmed) process.exit(0);
  }

  const options = (cliFramework && cliLanguage)
    ? { framework: cliFramework, language: cliLanguage }
    : await promptOptions();
  if (!options) process.exit(0);

  const templateName = getTemplateName(options.framework, options.language);

  console.log(yellow("\n  Downloading template...\n"));

  try {
    await downloadTemplate(templateName, root);
  } catch (err) {
    console.error(red(`\n  Failed to download template: ${(err as Error).message}\n`));
    process.exit(1);
  }

  updatePackageName(root, targetDir);

  const pm = detectPackageManager();
  const installCmd = getInstallCommand(pm);
  const devCmd = getRunCommand(pm, "dev");

  console.log(green("\n  ✓ Project created successfully\n"));
  console.log(dim("  Next steps:\n"));
  console.log(`  cd ${targetDir}`);
  console.log(`  ${installCmd}`);
  console.log(`  ${devCmd}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
