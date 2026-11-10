//home gallery screen: uses an explicit galleryitem union ("entry" | "create") instead of out-of-bounds undefined sentinels
import React, { useState } from "react";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import { KeyHints, type Hint } from "./KeyHints.tsx";
import { cycleIndex, windowFor } from "./PortfolioCard.tsx";
import { PALETTES, accentOf } from "./schema.ts";
import type { Entry, Gallery as GalleryData } from "./store.ts";

const NEW_ACCENT = PALETTES.ocean.accent;

type GalleryItem = { kind: "entry"; entry: Entry } | { kind: "create" };

//render the scrollable portfolio list alongside the live preview pane and skipped-file notices
export function Gallery({ gallery, onView, onEdit, onCreate }: {
  gallery: GalleryData;
  onView: (entry: Entry) => void;
  onEdit: (entry: Entry) => void;
  onCreate: () => void;
}) {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const { entries, errors } = gallery;
  const items: GalleryItem[] = [
    ...entries.map((entry): GalleryItem => ({ kind: "entry", entry })),
    { kind: "create" },
  ];
  const [index, setIndex] = useState(0);
  const current = items[index] ?? items[0]!;
  const wide = columns >= 70;
  const maxVisible = Math.max(3, rows - (wide ? 8 : 16) - errors.length);
  const { start, end } = windowFor(items.length, index, maxVisible);

  useInput((input, key) => {
    if (input === "q" || key.escape) return exit();
    if (input === "n") return onCreate();
    if (key.upArrow || input === "k") return setIndex((i) => cycleIndex(i, -1, items.length));
    if (key.downArrow || input === "j" || key.tab) return setIndex((i) => cycleIndex(i, 1, items.length));
    if (key.return) return current.kind === "entry" ? onView(current.entry) : onCreate();
    if (input === "e" && current.kind === "entry") return onEdit(current.entry);
  });

  const hints: Hint[] = [["↑↓", "browse"], ["enter", current.kind === "entry" ? "view" : "create"]];
  if (current.kind === "entry") hints.push(["e", "edit"]);
  hints.push(["n", "new"], ["q", "quit"]);

  const currentAccent = current.kind === "entry" ? accentOf(current.entry.data) : NEW_ACCENT;

  return (
    <Box flexDirection="column" width={Math.min(columns - 1, 96)}>
      <Box justifyContent="space-between" paddingX={1} marginBottom={1}>
        <Text bold>Terminal portfolios</Text>
        <Text dimColor>{plural(entries.length, "portfolio")}</Text>
      </Box>
      <Box flexDirection={wide ? "row" : "column"} borderStyle="round" borderColor="gray" paddingX={1}
        columnGap={3} rowGap={1}>
        <Box flexDirection="column" width={wide ? 30 : undefined} flexShrink={0}>
          {items.slice(start, end).map((item, offset) => {
            const i = start + offset;
            const active = i === index;
            const accent = item.kind === "entry" ? accentOf(item.entry.data) : NEW_ACCENT;
            return (
              <Text key={i} wrap="truncate" bold={active} color={active ? accent : undefined}>
                {active ? "›" : " "} <Text color={accent}>{item.kind === "entry" ? "●" : "+"}</Text>{" "}
                {item.kind === "entry" ? item.entry.data.name : "Add your portfolio"}
              </Text>
            );
          })}
        </Box>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Preview item={current} />
        </Box>
      </Box>
      {errors.map((e) => <Text key={e} dimColor wrap="truncate"> Skipped {e}</Text>)}
      <KeyHints hints={hints} accent={currentAccent} />
    </Box>
  );
}

//render the summary preview pane for either the highlighted portfolio or the "+ add your portfolio" action
function Preview({ item }: { item: GalleryItem }) {
  if (item.kind === "create") {
    return (
      <Box flexDirection="column" rowGap={1}>
        <Text bold>Add your portfolio</Text>
        <Text dimColor>A short wizard asks for your name, projects and links, then saves it to portfolios/ so it shows up here.</Text>
      </Box>
    );
  }
  const { data } = item.entry;
  const accent = accentOf(data);
  return (
    <Box flexDirection="column">
      <Text bold color={accent} wrap="truncate">{data.name}</Text>
      {data.role ? <Text wrap="truncate">{data.role}</Text> : null}
      {data.bio ? <Box marginTop={1}><Text dimColor wrap="truncate-end">{data.bio}</Text></Box> : null}
      <Box marginTop={1} columnGap={1} flexWrap="wrap">
        {data.skills.slice(0, 6).map((s) => <Text key={s} color={accent}>{s}</Text>)}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{plural(data.projects.length, "project")} · {plural(data.links.length, "link")}</Text>
      </Box>
    </Box>
  );
}

//format a count with a singular or plural noun
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
