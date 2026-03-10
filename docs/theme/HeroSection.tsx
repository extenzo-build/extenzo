import React from "react";
import { useI18n } from "@rspress/core/runtime";
import { HeroTerminalWithAnimation } from "./HeroDemo";

const HERO_LINE2_ORANGE_CLASS = "text-[#ff8a3d]";
const HERO_LINE2_PURPLE_CLASS = "text-[#7c3aed] dark:text-[#a78bfa]";

function HeroActions({ getStartedLink, configLink }: { getStartedLink: string; configLink: string }) {
  const t = useI18n();
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={getStartedLink}
        className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md bg-[var(--rp-c-brand-tint)] border border-[var(--rp-c-brand)] text-[var(--exo-home-text)] hover:bg-[var(--rp-c-brand-light)] hover:border-[var(--rp-c-brand-dark)] hover:shadow-[0_0_16px_var(--rp-c-brand-tint)] transition-colors dark:text-white dark:hover:text-white"
      >
        {t("homeHeroGetStarted")}
      </a>
      <a
        href={configLink}
        className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md bg-transparent border border-[var(--rp-c-brand)] text-[var(--exo-home-text)] no-underline cursor-pointer hover:border-[var(--rp-c-brand-dark)] hover:shadow-[0_0_12px_var(--rp-c-brand-tint)] transition-colors"
      >
        {t("homeHeroConfig")}
      </a>
    </div>
  );
}

function HeroContent({ getStartedLink, configLink }: { getStartedLink: string; configLink: string }) {
  const t = useI18n();
  return (
    <div className="min-w-0">
      <h1 className="text-[clamp(2.3rem,4.4vw,3rem)] font-bold tracking-tight leading-[1.1] text-[var(--exo-home-text)] mb-4">
        <span className="block">{t("homeHeroLine1")}</span>
        <span className="block mt-1">
          {/* <span className={HERO_LINE2_ORANGE_CLASS}>{t("homeHeroLine2Orange")}</span> */}
          <span className={HERO_LINE2_ORANGE_CLASS}>{t("homeHeroLine2Purple")}</span>
        </span>
      </h1>
      <p className="text-[1.0625rem] text-[var(--exo-home-muted)] mb-6 max-w-[42ch] leading-relaxed">
        {t("homeHeroTagline")}
      </p>
      <HeroActions getStartedLink={getStartedLink} configLink={configLink} />
    </div>
  );
}

export function HeroSection({ getStartedLink, configLink }: { getStartedLink: string; configLink: string }) {
  return (
    <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-16 p-8 rounded-2xl bg-[var(--exo-hero-gradient)] max-md:gap-8 max-md:p-6 max-md:px-6">
      <HeroContent getStartedLink={getStartedLink} configLink={configLink} />
      <div className="min-w-0">
        <HeroTerminalWithAnimation />
      </div>
    </section>
  );
}
