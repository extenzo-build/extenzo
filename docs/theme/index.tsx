import React from "react";
import { useLocation } from "@rspress/core/runtime";
import { getLocalePrefix } from "./utils";
import { HeroSection } from "./HeroSection";
import { FeaturesGrid } from "./FeaturesGrid";
import "./index.css";

function CustomHomeContent() {
  const { pathname } = useLocation();
  const base = getLocalePrefix(pathname);
  const getStartedLink = `${base}/guide/install`;
  const configLink = `${base}/config/manifest`;

  return (
    <div className="exo-home min-h-screen bg-[var(--exo-home-bg)] py-12 pb-20 box-border">
      <HeroSection
        getStartedLink={getStartedLink}
        configLink={configLink}
        githubLink="https://github.com/extenzo-build/extenzo"
      />
      <FeaturesGrid />
    </div>
  );
}

export function HomeLayout() {
  return <CustomHomeContent />;
}

export * from "@rspress/core/theme-original";
export { Tab, TabLabelPnpm, TabLabelNpm, TabLabelYarn, TabLabelBun } from "./PackageManagerTab";
