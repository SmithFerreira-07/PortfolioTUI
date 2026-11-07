import React, { useState } from "react";
import { loadPortfolioCatalog, type PortfolioEntry } from "./portfolio.ts";
import { PortfolioPicker, Viewer } from "./Viewer.tsx";
import BuilderWizard from "./builder/BuilderWizard.tsx";

type AppRoute =
  | { mode: "picker"; catalog: [PortfolioEntry, ...PortfolioEntry[]] }
  | { mode: "view"; entry: PortfolioEntry }
  | { mode: "builder" };

export default function App({
  initialMode = "view",
}: {
  initialMode?: "view" | "builder";
}) {
  const [route, setRoute] = useState<AppRoute>(() =>
    initialMode === "builder"
      ? { mode: "builder" }
      : { mode: "picker", catalog: loadPortfolioCatalog() }
  );

  if (route.mode === "builder") {
    return (
      <BuilderWizard
        onLaunchPortfolio={() => {
          const catalog = loadPortfolioCatalog();
          setRoute({ mode: "view", entry: catalog[0] });
        }}
      />
    );
  }

  if (route.mode === "picker") {
    return (
      <PortfolioPicker
        catalog={route.catalog}
        onSelect={(entry) => setRoute({ mode: "view", entry })}
        onOpenBuilder={() => setRoute({ mode: "builder" })}
      />
    );
  }

  return (
    <Viewer
      entry={route.entry}
      onBackToPicker={() =>
        setRoute({ mode: "picker", catalog: loadPortfolioCatalog() })
      }
      onOpenBuilder={() => setRoute({ mode: "builder" })}
    />
  );
}
