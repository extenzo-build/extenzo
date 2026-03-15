import React from "react";
import { useI18n } from "@rspress/core/runtime";
import { HeroTerminalWithAnimation } from "./HeroDemo";

const HERO_LINE2_ORANGE_CLASS = "text-[#ff8a3d]";
const HERO_LINE2_PURPLE_CLASS = "text-[#7c3aed] dark:text-[#a78bfa]";

function HeroActions({ getStartedLink, githubLink }: { getStartedLink: string; githubLink: string }) {
  const t = useI18n();
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={getStartedLink}
        className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md bg-[var(--rp-c-brand)] text-white border border-[var(--rp-c-brand)] no-underline hover:opacity-90 transition-opacity"
      >
        {t("homeHeroGetStarted")}
      </a>
      <a
        href={githubLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md bg-transparent border border-[var(--exo-home-border)] text-[var(--exo-home-text)] no-underline hover:border-[var(--exo-home-muted)] hover:bg-[var(--exo-home-border)]/30 transition-colors"
      >
        {t("homeHeroViewOnGithub")}
      </a>
    </div>
  );
}

function HeroContent({ getStartedLink, githubLink }: { getStartedLink: string; githubLink: string }) {
  const t = useI18n();
  return (
    <div className="min-w-0">
      <h1 className="text-[clamp(2.8rem,5.5vw,3.75rem)] font-bold tracking-tight leading-[1.1] text-[var(--exo-home-text)] mb-4">
        <span className="block">{t("homeHeroLine1")}</span>
        <span className="block mt-1">
          {/* <span className={HERO_LINE2_ORANGE_CLASS}>{t("homeHeroLine2Orange")}</span> */}
          <span className={HERO_LINE2_ORANGE_CLASS}>{t("homeHeroLine2Purple")}</span>
        </span>
      </h1>
      <p className="text-[1.0625rem] text-[var(--exo-home-muted)] mb-6 max-w-[42ch] leading-relaxed">
        {t("homeHeroTagline")}
      </p>
      <HeroActions getStartedLink={getStartedLink} githubLink={githubLink} />
    </div>
  );
}

export function HeroSection({ getStartedLink, configLink, githubLink }: { getStartedLink: string; configLink: string; githubLink?: string }) {
  const repoUrl = githubLink ?? "https://github.com/extenzo-build/extenzo";
  return (
    <section className="exo-hero-bg w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-16 p-8 rounded-2xl max-md:gap-8 max-md:p-6 max-md:px-6">
      <HeroContent getStartedLink={getStartedLink} githubLink={repoUrl} />
      <div className="min-w-0 max-w-[420px] md:max-w-[600px]">
        <HeroTerminalWithAnimation />
      </div>
    </section>
  );
}
