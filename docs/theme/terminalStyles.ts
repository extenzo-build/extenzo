export const termLine = {
  prompt: "text-[var(--exo-term-prompt)]",
  exo: "text-[var(--exo-term-exo)]",
  value: "text-[var(--exo-term-value)]",
  done: "text-[var(--exo-term-done)] font-bold",
  purple: "text-[var(--exo-term-purple)]",
  time: "text-[var(--exo-term-time)]",
  cyan: "text-[var(--exo-term-cyan)]",
} as const;

export const termTable =
  "table my-2 text-[0.8125rem] border-collapse font-mono border border-[var(--exo-term-border)] text-[var(--exo-term-value)] [&_th]:px-3 [&_th]:py-1 [&_th]:text-left [&_th]:border [&_th]:border-[var(--exo-term-border)] [&_th]:text-[var(--exo-term-purple)] [&_th]:font-semibold [&_th]:bg-black/15 [&_td]:px-3 [&_td]:py-1 [&_td]:text-left [&_td]:border [&_td]:border-[var(--exo-term-border)] [&_tbody_tr:hover_td]:bg-black/10";

export const termBody = "p-3 px-4 font-mono text-[0.75rem] leading-[1.7] whitespace-pre-wrap break-all";

export const termBox =
  "border border-[var(--exo-term-border)] rounded-lg overflow-hidden bg-[var(--exo-term-bg)] shadow-[var(--exo-term-shadow)]";
