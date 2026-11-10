//specialized wizard steps (skills, style, review) that manage local ui state beyond generic fields or liststep
import React, { useState } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import { Banner } from "../Banner.tsx";
import { PortfolioCard, cycleIndex, useCardState } from "../PortfolioCard.tsx";
import { FONTS, FONT_IDS, PALETTES, PALETTE_IDS, splitSkills, type Portfolio } from "../schema.ts";
import { Fields } from "./Fields.tsx";

//edit comma-separated skills with a live tag preview while syncing parsed skills to the parent draft on each keystroke
export function SkillsStep({ skills, onChange, onNext, onBack, accent }: {
  skills: string[];
  onChange: (skills: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  accent: string;
}) {
  const [value, setValue] = useState(skills.join(", "));
  const parsed = splitSkills(value);

  //keep raw comma text locally for typing comfort while immediately updating parsed skills upstream
  const handleChange = (next: string) => {
    setValue(next);
    onChange(splitSkills(next));
  };
  return (
    <Box flexDirection="column" rowGap={1}>
      <Fields accent={accent} values={{ skills: value }} onChange={(_, v) => handleChange(v)}
        fields={[{ key: "skills", label: "Skills, separated by commas", placeholder: "TypeScript, Rust, Postgres, Figma" }]}
        onSubmit={onNext} onEscape={onBack} />
      {parsed.length ? (
        <Box paddingLeft={2} columnGap={1} flexWrap="wrap">
          {parsed.map((s, i) => <Text key={i} color={accent}>{s}</Text>)}
        </Box>
      ) : null}
    </Box>
  );
}

//pick palette and font using explicit "palette" | "font" focus state (no meta-table casts) and a live banner preview
export function StyleStep({ data, onChange, onNext, onBack, accent }: {
  data: Portfolio;
  onChange: (theme: Portfolio["theme"]) => void;
  onNext: () => void;
  onBack: () => void;
  accent: string;
}) {
  const { columns } = useWindowSize();
  const [focus, setFocus] = useState<"palette" | "font">("palette");

  useInput((input, key) => {
    if (key.escape) return onBack();
    if (key.return) return onNext();
    if (key.upArrow || key.downArrow || key.tab || input === "j" || input === "k") {
      return setFocus((current) => (current === "palette" ? "font" : "palette"));
    }
    const delta = key.leftArrow || input === "h" ? -1 : key.rightArrow || input === "l" ? 1 : 0;
    if (!delta) return;
    if (focus === "palette") {
      const nextIdx = cycleIndex(PALETTE_IDS.indexOf(data.theme.palette), delta, PALETTE_IDS.length);
      onChange({ ...data.theme, palette: PALETTE_IDS[nextIdx]! });
    } else {
      const nextIdx = cycleIndex(FONT_IDS.indexOf(data.theme.font), delta, FONT_IDS.length);
      onChange({ ...data.theme, font: FONT_IDS[nextIdx]! });
    }
  });

  return (
    <Box flexDirection="column" rowGap={1}>
      <Box flexDirection="column">
        <StyleOptionRow label="Palette" valueLabel={PALETTES[data.theme.palette].label} active={focus === "palette"} accent={accent} />
        <StyleOptionRow label="Font" valueLabel={FONTS[data.theme.font].label} active={focus === "font"} accent={accent} />
      </Box>
      <Box borderStyle="round" borderColor={accent} paddingX={2} paddingY={1} alignSelf="flex-start">
        <Banner key={data.theme.font} name={data.name} palette={data.theme.palette} font={data.theme.font}
          maxWidth={Math.max(20, Math.min(columns - 8, 90))} />
      </Box>
    </Box>
  );
}

//render a single focusable option row for the style step
function StyleOptionRow({ label, valueLabel, active, accent }: {
  label: string;
  valueLabel: string;
  active: boolean;
  accent: string;
}) {
  return (
    <Text color={active ? accent : undefined} bold={active} dimColor={!active}>
      {active ? "› " : "  "}{label.padEnd(9)}
      {active ? "‹ " : "  "}{valueLabel}{active ? " ›" : ""}
    </Text>
  );
}

//preview the normalized portfolio with full section/item navigation via shared usecardstate before saving
export function ReviewStep({ data, error, onSave, onBack }: {
  data: Portfolio;
  error: string | null;
  onSave: () => void;
  onBack: () => void;
}) {
  const card = useCardState(data);

  useInput((_input, key) => {
    if (key.escape) return onBack();
    if (key.return) return onSave();
  });

  return (
    <Box flexDirection="column">
      <PortfolioCard data={data} {...card} animate={false} />
      {error ? <Text color="red">Couldn't save: {error}</Text> : null}
    </Box>
  );
}
