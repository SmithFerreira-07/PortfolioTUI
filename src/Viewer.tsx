import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { cycle } from "./builder/FormControls.tsx";
import type { PortfolioEntry } from "./portfolio.ts";

const TABS = ["about", "skills", "projects", "contact"] as const;
type Tab = (typeof TABS)[number];

export function PortfolioPicker({
  catalog,
  onSelect,
  onOpenBuilder,
}: {
  catalog: [PortfolioEntry, ...PortfolioEntry[]];
  onSelect: (entry: PortfolioEntry) => void;
  onOpenBuilder: () => void;
}) {
  const { exit } = useApp();
  const [selectedId, setSelectedId] = useState<string>(catalog[0].id);

  const current =
    catalog.find((item) => item.id === selectedId) ?? catalog[0];
  const { accentColor, borderStyle } = current.data.theme;

  useInput((input, key) => {
    if (input === "q" || key.escape) return exit();
    if (input === "c" || input === "e") return onOpenBuilder();
    if (key.upArrow || key.leftArrow) {
      setSelectedId(cycle(catalog, current, -1).id);
      return;
    }
    if (key.downArrow || key.rightArrow || key.tab) {
      setSelectedId(cycle(catalog, current, 1).id);
      return;
    }
    if (key.return) {
      onSelect(current);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color={accentColor}>
          ✦ portfolio-cli — Select a Portfolio
        </Text>
        <Text color="gray">{catalog.length} portfolios available</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {catalog.map((entry) => {
          const isSelected = entry.id === current.id;
          const entryAccent = entry.data.theme.accentColor;
          return (
            <Box key={entry.id} gap={1}>
              <Text
                bold={isSelected}
                color={isSelected ? entryAccent : "white"}
              >
                {isSelected ? "▸" : " "} {entry.data.profile.name}
              </Text>
              <Text color="gray">— {entry.data.profile.role}</Text>
              <Text color={entryAccent}>
                [{entryAccent} / {entry.data.theme.borderStyle}]
              </Text>
              {entry.isUserCustom && (
                <Text color="cyan" bold>
                  ★ custom
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Live Preview Card for Highlighted Portfolio */}
      <Box
        borderStyle={borderStyle}
        borderColor={accentColor}
        padding={1}
        flexDirection="column"
      >
        <Box justifyContent="space-between">
          <Text bold color={accentColor}>
            {current.data.profile.name} ({current.fileName})
          </Text>
          <Text color="gray">
            theme: {accentColor} • border: {borderStyle}
          </Text>
        </Box>
        <Text color="gray">{current.data.profile.role}</Text>
        <Box marginTop={1}>
          <Text>{current.data.profile.bio}</Text>
        </Box>
        <Box marginTop={1} gap={1} flexWrap="wrap">
          {current.data.skills.slice(0, 5).map((s) => (
            <Text key={s} color={accentColor}>
              [{s}]
            </Text>
          ))}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          ↑/↓: Choose portfolio • Enter: Open TUI • c: Create/Edit custom • q:
          Quit
        </Text>
      </Box>
    </Box>
  );
}

export function Viewer({
  entry,
  onBackToPicker,
  onOpenBuilder,
}: {
  entry: PortfolioEntry;
  onBackToPicker: () => void;
  onOpenBuilder: () => void;
}) {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const { data } = entry;
  const { accentColor, borderStyle } = data.theme;

  useInput((input, key) => {
    if (input === "q") return exit();
    if (input === "b" || key.escape) return onBackToPicker();
    if (input === "e" || input === "c") return onOpenBuilder();
    if (key.rightArrow || key.tab) setActiveTab((t) => cycle(TABS, t, 1));
    if (key.leftArrow) setActiveTab((t) => cycle(TABS, t, -1));
  });

  const contactRows = (
    Object.entries(data.contact) as [string, string][]
  ).filter(([, value]) => value.length > 0);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color={accentColor}>
          {data.profile.name} — portfolio-cli
        </Text>
        <Text color="gray">
          theme: <Text color={accentColor}>{accentColor}</Text> ({borderStyle})
        </Text>
      </Box>

      <Box gap={2} marginBottom={1}>
        {TABS.map((tab) => (
          <Text
            key={tab}
            color={activeTab === tab ? accentColor : "gray"}
            bold={activeTab === tab}
            underline={activeTab === tab}
          >
            {tab}
          </Text>
        ))}
      </Box>

      <Box
        borderStyle={borderStyle}
        borderColor={accentColor}
        padding={1}
        minHeight={8}
        flexDirection="column"
      >
        {activeTab === "about" && (
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="column">
              <Text bold color={accentColor}>
                hi, i'm {data.profile.name}.
              </Text>
              <Text color="gray">{data.profile.role}</Text>
            </Box>
            <Text>{data.profile.bio}</Text>
          </Box>
        )}

        {activeTab === "skills" && (
          <Box flexDirection="column" gap={1}>
            <Text bold color={accentColor}>
              Skills & Tech Stack
            </Text>
            <Box flexWrap="wrap" gap={1}>
              {data.skills.map((skill, idx) => (
                <Text key={`${skill}-${idx}`} color={accentColor}>
                  • {skill}
                </Text>
              ))}
            </Box>
          </Box>
        )}

        {activeTab === "projects" && (
          <Box flexDirection="column" gap={1}>
            {data.projects.map((proj, idx) => (
              <Box key={`${proj.title}-${idx}`} flexDirection="column">
                <Text bold color={accentColor}>
                  ▸ {proj.title}
                </Text>
                <Text>  {proj.description}</Text>
                {proj.link ? (
                  <Text color="gray">  ↳ {proj.link}</Text>
                ) : null}
              </Box>
            ))}
          </Box>
        )}

        {activeTab === "contact" && (
          <Box flexDirection="column">
            {contactRows.length === 0 ? (
              <Text color="gray">No contact links configured.</Text>
            ) : (
              contactRows.map(([label, value]) => (
                <Text key={label}>
                  <Text bold color={accentColor}>
                    {label}:{" "}
                  </Text>
                  {value}
                </Text>
              ))
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          ←/→: switch tabs • b/Esc: switch portfolio • c: create/edit • q: quit
        </Text>
      </Box>
    </Box>
  );
}
