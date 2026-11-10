//shared portfolio card view and navigation hook at src/ so viewer and reviewstep share identical browsing without cross-feature imports
import React, { useState } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import { Banner } from "./Banner.tsx";
import { accentOf, prettyUrl, type Portfolio } from "./schema.ts";

export const SECTIONS = ["About", "Projects", "Links"] as const;
export type Section = (typeof SECTIONS)[number];

const PROJECT_ROWS = 4;
const CARD_BORDER = 2;
const CARD_PAD_X = 2;
const NAV_WIDTH = 14;
const NAV_GAP = 2;
const CHROME_ROWS = 17;

//render the framed portfolio card with banner, headline, navigation tabs, and active section body
export function PortfolioCard({ data, section, selected, width, maxHeight, animate }: {
  data: Portfolio;
  section: Section;
  selected: number | null;
  width: number;
  maxHeight: number;
  animate?: boolean;
}) {
  const accent = accentOf(data);
  const vertical = width >= 64;
  const innerWidth = width - CARD_BORDER - CARD_PAD_X * 2;
  const paneWidth = innerWidth - (vertical ? NAV_WIDTH + NAV_GAP : 0);
  const height = Math.min(maxHeight, naturalHeight(data, paneWidth));
  return (
    <Box flexDirection="column" width={width} borderStyle="round" borderColor={accent} paddingX={CARD_PAD_X} paddingY={1}>
      <Banner name={data.name} palette={data.theme.palette} font={data.theme.font} maxWidth={innerWidth} animate={animate} />
      {data.role ? <Box marginTop={1}><Text bold>{data.role}</Text></Box> : null}
      <Box marginTop={1} flexDirection={vertical ? "row" : "column"}>
        <Nav data={data} section={section} accent={accent} vertical={vertical} />
        <Box flexDirection="column" flexGrow={1} flexShrink={1} paddingLeft={vertical ? NAV_GAP : 0}
          height={height} overflow="hidden">
          {section === "About" && <About data={data} accent={accent} />}
          {section === "Projects" && <Projects data={data} selected={selected ?? 0} accent={accent} height={height} />}
          {section === "Links" && <Links data={data} selected={selected ?? 0} accent={accent} height={height} />}
        </Box>
      </Box>
    </Box>
  );
}

//self-contained card navigation hook; owns its own useinput listener so callers don't manually forward key events
export function useCardState(data: Portfolio) {
  const { columns, rows } = useWindowSize();
  const width = Math.max(30, Math.min(columns - 1, 96));
  const maxHeight = Math.max(4, Math.min(14, rows - CHROME_ROWS));
  const [section, setSection] = useState<Section>("About");
  const [indices, setIndices] = useState({ Projects: 0, Links: 0 });

  const count = section === "Projects" ? data.projects.length : section === "Links" ? data.links.length : 0;
  const selected = section === "About" ? null : Math.min(indices[section], Math.max(0, count - 1));
  const target =
    section === "Projects" && selected !== null ? data.projects[selected]?.link
    : section === "Links" && selected !== null ? data.links[selected]?.url
    : undefined;

  //cycle the active card section forward or backward
  const stepSection = (delta: number) =>
    setSection((s) => SECTIONS[cycleIndex(SECTIONS.indexOf(s), delta, SECTIONS.length)]!);

  //move the selection cursor within the active projects or links list
  const move = (delta: number) => {
    if (section === "About" || !count || selected === null) return;
    setIndices((s) => ({ ...s, [section]: cycleIndex(selected, delta, count) }));
  };

  useInput((input, key) => {
    if (/^[1-3]$/.test(input)) return setSection(SECTIONS[Number(input) - 1]!);
    if (key.tab) return stepSection(key.shift ? -1 : 1);
    if (key.rightArrow || input === "l") return stepSection(1);
    if (key.leftArrow || input === "h") return stepSection(-1);
    if (key.upArrow || input === "k") return move(-1);
    if (key.downArrow || input === "j") return move(1);
  });

  return { section, selected, target, width, maxHeight };
}

//render section tabs as a left sidebar on wide terminals or a top row on narrow ones
function Nav({ data, section, accent, vertical }: {
  data: Portfolio;
  section: Section;
  accent: string;
  vertical: boolean;
}) {
  const counts: Record<Section, number | null> = { About: null, Projects: data.projects.length, Links: data.links.length };
  const items = SECTIONS.map((s) => {
    const active = s === section;
    return (
      <Text key={s} color={active ? accent : undefined} bold={active} dimColor={!active} wrap="truncate">
        {vertical ? (active ? "▍ " : "  ") : ""}
        {s}
        {counts[s] ? <Text dimColor> {counts[s]}</Text> : null}
      </Text>
    );
  });
  return vertical ? (
    <Box flexDirection="column" width={NAV_WIDTH} flexShrink={0} borderStyle="single" borderColor="gray"
      borderTop={false} borderBottom={false} borderLeft={false}>
      {items}
    </Box>
  ) : (
    <Box columnGap={3} marginBottom={1}>{items}</Box>
  );
}

//render the bio paragraph and inline skill tags for the about tab
function About({ data, accent }: { data: Portfolio; accent: string }) {
  if (!data.bio && !data.skills.length) return <Text dimColor>No bio yet.</Text>;
  return (
    <Box flexDirection="column" rowGap={1}>
      {data.bio ? <Text>{data.bio}</Text> : null}
      {data.skills.length ? (
        <Box flexWrap="wrap" columnGap={1}>
          {data.skills.map((skill, i) => (
            <Text key={i}>
              <Text color={accent}>{skill}</Text>
              {i < data.skills.length - 1 ? <Text dimColor> ·</Text> : null}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

//render a windowed slice of projects, reserving 1 row for "↓ n more" when overflowing so it isn't clipped
function Projects({ data, selected, accent, height }: { data: Portfolio; selected: number; accent: string; height: number }) {
  const count = data.projects.length;
  if (!count) return <Text dimColor>No projects yet.</Text>;
  const fits = count * PROJECT_ROWS - 1 <= height;
  const maxVisible = fits ? count : Math.max(1, Math.floor((height - 1) / PROJECT_ROWS));
  const { start, end } = windowFor(count, selected, maxVisible);
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" rowGap={1}>
        {data.projects.slice(start, end).map((project, offset) => {
          const active = start + offset === selected;
          return (
            <Box key={start + offset} flexDirection="column">
              <Text bold color={active ? accent : undefined} wrap="truncate">
                {active ? "› " : "  "}{project.title}
              </Text>
              <Box paddingLeft={2} flexDirection="column">
                {project.description ? <Text dimColor={!active} wrap="truncate-end">{project.description}</Text> : null}
                {project.link ? <Text color={active ? accent : "gray"} wrap="truncate">↗ {prettyUrl(project.link)}</Text> : null}
              </Box>
            </Box>
          );
        })}
      </Box>
      {end < count ? <Text dimColor>  ↓ {count - end} more</Text> : null}
    </Box>
  );
}

//render a windowed list of aligned label + url rows for the links tab
function Links({ data, selected, accent, height }: { data: Portfolio; selected: number; accent: string; height: number }) {
  const count = data.links.length;
  if (!count) return <Text dimColor>No links yet.</Text>;
  const labelWidth = Math.max(...data.links.map((l) => (l.label || "Link").length)) + 2;
  const { start, end } = windowFor(count, selected, height);
  return (
    <Box flexDirection="column">
      {data.links.slice(start, end).map((link, offset) => {
        const i = start + offset;
        const active = i === selected;
        return (
          <Text key={i} wrap="truncate" color={active ? accent : undefined} bold={active}>
            {active ? "› " : "  "}
            <Text dimColor={!active}>{(link.label || "Link").padEnd(labelWidth)}</Text>
            {prettyUrl(link.url)}
          </Text>
        );
      })}
    </Box>
  );
}

//lock card height to the tallest tab so switching between about, projects, and links doesn't jump the border
function naturalHeight(data: Portfolio, paneWidth: number) {
  const lines = (chars: number) => Math.ceil(chars / Math.max(10, paneWidth));
  const skillChars = data.skills.reduce((sum, s) => sum + s.length + 3, 0);
  const about = lines(data.bio.length) + (data.bio && data.skills.length ? 1 : 0) + lines(skillChars);
  const projects = data.projects.length * PROJECT_ROWS - 1;
  return Math.max(3, about, projects, data.links.length);
}

//compute a clamped [start, end) viewport slice that stays non-negative even when count < maxvisible
export function windowFor(count: number, selected: number, maxVisible: number) {
  const visible = Math.max(1, Math.min(count, maxVisible));
  const start = Math.min(Math.max(0, selected - visible + 1), Math.max(0, count - visible));
  return { start, end: start + visible };
}

//wrap an index modularly in both directions within [0, count)
export function cycleIndex(current: number, delta: number, count: number): number {
  return count > 0 ? (current + delta + count) % count : 0;
}
