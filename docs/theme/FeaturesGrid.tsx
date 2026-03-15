import React from "react";
import { useI18n } from "@rspress/core/runtime";
import {
  FeatureHmrFlow,
  FeatureBrowsers,
  FeatureFrameworks,
  FeatureContentUi,
  FeatureBundleAnalysis,
  FeatureZip,
  FeatureAiTerminal,
} from "./FeatureAnimations";

function FeatureCardWrapper({
  titleKey,
  detailsKey,
  children,
  contentClassName,
}: {
  titleKey: string;
  detailsKey: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const t = useI18n();
  return (
    <div className="p-3.5 border border-[var(--exo-home-border)] rounded-md flex flex-col">
      <div className="mb-3">
        <h3 className="text-[1.0625rem] font-semibold text-[var(--exo-home-text)] mb-1 text-left">{t(titleKey)}</h3>
        <p className="text-[0.9375rem] text-[var(--exo-home-muted)] m-0 leading-snug text-left">{t(detailsKey)}</p>
      </div>
      <div className={`flex items-center justify-center overflow-hidden shrink-0 ${contentClassName ?? "h-[220px]"}`}>{children}</div>
    </div>
  );
}

function SimpleFeatureCard({
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
    <div className="p-3.5 border border-[var(--exo-home-border)] rounded-md flex flex-col">
      <div className="mb-3">
        <h3 className="text-[1.0625rem] font-semibold text-[var(--exo-home-text)] mb-1 text-left">{t(titleKey)}</h3>
        <p className="text-[0.9375rem] text-[var(--exo-home-muted)] m-0 leading-snug text-left">{t(detailsKey)}</p>
      </div>
      <div className="h-[120px] flex items-center justify-center shrink-0">
        <span className="text-3xl" aria-hidden>{icon}</span>
      </div>
    </div>
  );
}

type FeatureItem =
  | { titleKey: string; detailsKey: string; render: () => React.ReactNode; contentClassName?: string }
  | { titleKey: string; detailsKey: string; icon: string };

const ROW1_ITEMS: FeatureItem[] = [
  { titleKey: "homeFeature5Title", detailsKey: "homeFeature5Details", render: () => <FeatureHmrFlow /> },
  { titleKey: "homeFeature4Title", detailsKey: "homeFeature4Details", render: () => <FeatureBrowsers /> },
  { titleKey: "homeFeature2Title", detailsKey: "homeFeature2Details", render: () => <FeatureFrameworks /> },
  { titleKey: "homeFeature6Title", detailsKey: "homeFeature6Details", render: () => <FeatureContentUi /> },
  { titleKey: "homeFeatureBundleAnalysisTitle", detailsKey: "homeFeatureBundleAnalysisDetails", render: () => <FeatureBundleAnalysis /> },
  { titleKey: "homeFeature8Title", detailsKey: "homeFeature8Details", render: () => <FeatureZip /> },
];

const ROW2_ITEMS: FeatureItem[] = [
  { titleKey: "homeFeature7Title", detailsKey: "homeFeature7Details", render: () => <FeatureAiTerminal />, contentClassName: "h-[320px]" },
  { titleKey: "homeFeatureSkillsTitle", detailsKey: "homeFeatureSkillsDetails", icon: "🧩" },
];

function FeatureRow({ titleKey, subtitleKey, items }: { titleKey: string; subtitleKey?: string; items: FeatureItem[] }) {
  const t = useI18n();
  return (
    <div className="mt-8 first:mt-0">
      <h2 className={`text-center text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-tight text-[var(--exo-home-text)] ${subtitleKey ? "mb-2" : "mb-4"}`}>
        {t(titleKey)}
      </h2>
      {subtitleKey && (
        <p className="text-center text-[var(--exo-home-muted)] text-[clamp(0.9375rem,2vw,1.0625rem)] max-w-2xl mx-auto mb-4">
          {t(subtitleKey)}
        </p>
      )}
      <div className={`grid grid-cols-1 gap-4 ${items.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {items.map((f, i) =>
          "render" in f ? (
            <FeatureCardWrapper
              key={i}
              titleKey={f.titleKey}
              detailsKey={f.detailsKey}
              contentClassName={"contentClassName" in f ? f.contentClassName : undefined}
            >
              {f.render()}
            </FeatureCardWrapper>
          ) : (
            <SimpleFeatureCard key={i} icon={f.icon} titleKey={f.titleKey} detailsKey={f.detailsKey} />
          )
        )}
      </div>
    </div>
  );
}

export function FeaturesGrid() {
  return (
    <section className="w-full mt-10">
      <FeatureRow titleKey="homeFeaturesRow1Title" subtitleKey="homeFeaturesRow1Subtitle" items={ROW1_ITEMS} />
      <FeatureRow titleKey="homeFeaturesRow2Title" subtitleKey="homeFeaturesRow2Subtitle" items={ROW2_ITEMS} />
    </section>
  );
}
