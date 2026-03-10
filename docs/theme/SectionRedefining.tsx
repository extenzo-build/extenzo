import React from "react";
import { useI18n } from "@rspress/core/runtime";
import { BlockDevTerminal } from "./BlockDevTerminal";
import { BlockBuildTerminal } from "./BlockBuildTerminal";

function BlockLeft() {
  const t = useI18n();
  return (
    <div className="py-6 px-7 border-r border-[var(--exo-home-border)] max-md:border-r-0 max-md:border-b max-md:border-[var(--exo-home-border)] max-md:last:border-b-0">
      <h3 className="text-base font-semibold text-[var(--exo-home-text)] mb-2">{t("homeBlock1Title")}</h3>
      <p className="text-sm text-[var(--exo-home-muted)] leading-normal mb-4">{t("homeBlock1Desc")}</p>
      <div className="mt-2">
        <BlockDevTerminal />
      </div>
    </div>
  );
}

function BlockRight() {
  const t = useI18n();
  return (
    <div className="py-6 px-7 max-md:border-b max-md:border-[var(--exo-home-border)] max-md:last:border-b-0">
      <h3 className="text-base font-semibold text-[var(--exo-home-text)] mb-2">{t("homeBlock2Title")}</h3>
      <p className="text-sm text-[var(--exo-home-muted)] leading-normal mb-4">{t("homeBlock2Desc")}</p>
      <div className="mt-2">
        <BlockBuildTerminal />
      </div>
    </div>
  );
}

export function SectionRedefining() {
  const t = useI18n();
  return (
    <section className="w-full mt-16 pt-12 border-t border-[var(--exo-home-border)]">
      <h2 className="text-[1.75rem] font-bold text-[var(--exo-home-text)] mb-2">{t("homeFeaturesSectionTitle")}</h2>
      <p className="text-base text-[var(--exo-home-muted)] mb-10">{t("homeFeaturesSectionSubtitle")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 border border-[var(--exo-home-border)] rounded-lg overflow-hidden bg-[var(--exo-home-block-bg)]">
        <BlockLeft />
        <BlockRight />
      </div>
    </section>
  );
}
