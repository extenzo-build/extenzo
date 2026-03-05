export type Framework =
  | "vanilla"
  | "vue"
  | "react"
  | "preact"
  | "svelte"
  | "solid"
  | "uno";

export type Language = "js" | "ts";

export const FRAMEWORKS: { title: string; value: Framework }[] = [
  { title: "Vanilla", value: "vanilla" },
  { title: "Vue", value: "vue" },
  { title: "React", value: "react" },
  { title: "React + UnoCSS", value: "uno" },
  { title: "Preact", value: "preact" },
  { title: "Svelte", value: "svelte" },
  { title: "Solid", value: "solid" },
];

export const LANGUAGES: { title: string; value: Language }[] = [
  { title: "JavaScript", value: "js" },
  { title: "TypeScript", value: "ts" },
];

export function getTemplateName(framework: Framework, language: Language): string {
  return `template-${framework}-${language}`;
}
