import React from "react";
import { useI18n } from "@rspress/core/runtime";

function FeatureCard({
  icon,
  titleKey,
  detailsKey,
}: {
  icon: string;
  titleKey: string;
  detailsKey: string;
}) {
  const t = useI18n();
  return (
    <div className="p-4 px-5 border border-[var(--exo-home-border)] rounded-md bg-[var(--exo-home-card-bg)] transition-colors hover:border-[var(--exo-home-muted)] hover:bg-[var(--exo-home-card-hover)]">
      <div className="text-xl mb-1.5 leading-none">{icon}</div>
      <h3 className="text-[0.9375rem] font-semibold text-[var(--exo-home-text)] mb-1">{t(titleKey)}</h3>
      <p className="text-[0.8125rem] text-[var(--exo-home-muted)] m-0 leading-normal">{t(detailsKey)}</p>
    </div>
  );
}

const FEATURES: Array<{ icon: string; titleKey: string; detailsKey: string }> = [
  { icon: "📦", titleKey: "homeFeature1Title", detailsKey: "homeFeature1Details" },
  { icon: "📦", titleKey: "homeFeature2Title", detailsKey: "homeFeature2Details" },
  { icon: "🚀", titleKey: "homeFeature3Title", detailsKey: "homeFeature3Details" },
  { icon: "🌐", titleKey: "homeFeature4Title", detailsKey: "homeFeature4Details" },
  { icon: "⚡", titleKey: "homeFeature5Title", detailsKey: "homeFeature5Details" },
  { icon: "📄", titleKey: "homeFeature6Title", detailsKey: "homeFeature6Details" },
  { icon: "🐛", titleKey: "homeFeature7Title", detailsKey: "homeFeature7Details" },
  { icon: "🐛", titleKey: "homeFeature8Title", detailsKey: "homeFeature8Details" },
  { icon: "🐛", titleKey: "homeFeature9Title", detailsKey: "homeFeature9Details" },
];

export function FeaturesGrid() {
  const t = useI18n();
  return (
    <section className="w-full mt-12">
      <h2 className="text-sm font-semibold text-[var(--exo-home-muted)] uppercase tracking-wider mb-5">{t("homeFeaturesGridTitle")}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {FEATURES.map((f, i) => (
          <FeatureCard
            key={i}
            icon={f.icon}
            titleKey={f.titleKey}
            detailsKey={f.detailsKey}
          />
        ))}
      </div>
    </section>
  );
}
