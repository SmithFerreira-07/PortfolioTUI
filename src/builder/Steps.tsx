import React from "react";
import { Box, Text, useInput } from "ink";
import {
  BORDER_STYLES,
  THEME_COLORS,
  type BorderStyle,
  type ContactInfo,
  type PortfolioData,
  type ProfileInfo,
  type ProjectItem,
  type ThemeColor,
  type ThemeConfig,
} from "../portfolio.ts";
import { cycle, type FieldDescriptor } from "./FormControls.tsx";

export const PROFILE_FIELDS: readonly [
  FieldDescriptor<keyof ProfileInfo>,
  ...FieldDescriptor<keyof ProfileInfo>[],
] = [
  { key: "name", label: "Name / Handle", placeholder: "e.g. Ada Lovelace" },
  {
    key: "role",
    label: "Role / Headline",
    placeholder: "e.g. Full-Stack Engineer & Open Source Creator",
  },
  {
    key: "bio",
    label: "Short Bio",
    placeholder:
      "e.g. Passionate about building fast terminal tools and distributed systems.",
  },
];

export const SKILL_FIELD: readonly [FieldDescriptor<"skill">] = [
  {
    key: "skill",
    label: "Add Skill (Enter to add, Enter when empty to continue)",
    placeholder: "e.g. TypeScript, Rust, React, Linux",
  },
];

export const PROJECT_FIELDS: readonly [
  FieldDescriptor<keyof ProjectItem>,
  ...FieldDescriptor<keyof ProjectItem>[],
] = [
  {
    key: "title",
    label: "Project Title (leave empty and press Enter through to continue)",
    placeholder: "e.g. PortfolioTUI",
  },
  {
    key: "description",
    label: "Description",
    placeholder: "e.g. A terminal portfolio generator built with Bun and Ink",
  },
  {
    key: "link",
    label: "Link / Repo URL (press Enter here to save project)",
    placeholder: "e.g. https://github.com/username/portfolio-tui",
  },
];

export const CONTACT_FIELDS: readonly [
  FieldDescriptor<keyof ContactInfo>,
  ...FieldDescriptor<keyof ContactInfo>[],
] = [
  { key: "github", label: "GitHub", placeholder: "e.g. github.com/username" },
  { key: "email", label: "Email", placeholder: "e.g. you@example.com" },
  {
    key: "website",
    label: "Website / Blog",
    placeholder: "e.g. https://yourname.dev",
  },
  {
    key: "socials",
    label: "Other Socials (LinkedIn / X / Mastodon)",
    placeholder: "e.g. @username",
  },
];

export function ThemeStep({
  theme,
  previewProfile,
  onChangeTheme,
  onComplete,
  onBack,
}: {
  theme: ThemeConfig;
  previewProfile: ProfileInfo;
  onChangeTheme: (next: ThemeConfig) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const { accentColor, borderStyle } = theme;

  useInput((_input, key) => {
    if (key.escape) return onBack();
    if (key.leftArrow) {
      return onChangeTheme({
        ...theme,
        accentColor: cycle(THEME_COLORS, accentColor, -1),
      });
    }
    if (key.rightArrow || key.tab) {
      return onChangeTheme({
        ...theme,
        accentColor: cycle(THEME_COLORS, accentColor, 1),
      });
    }
    if (key.upArrow) {
      return onChangeTheme({
        ...theme,
        borderStyle: cycle(BORDER_STYLES, borderStyle, -1),
      });
    }
    if (key.downArrow) {
      return onChangeTheme({
        ...theme,
        borderStyle: cycle(BORDER_STYLES, borderStyle, 1),
      });
    }
    if (key.return) onComplete();
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Theme Customization</Text>
        <Text color="gray">
          ←/→: Accent Color • ↑/↓: Border Style • Enter: Continue
        </Text>
      </Box>

      <Box gap={2} marginBottom={1}>
        <Text bold>Color:</Text>
        {THEME_COLORS.map((color) => {
          const isSelected = color === accentColor;
          return (
            <Text
              key={color}
              color={color}
              bold={isSelected}
              underline={isSelected}
            >
              {isSelected ? `● ${color}` : `○ ${color}`}
            </Text>
          );
        })}
      </Box>

      <Box gap={2} marginBottom={1}>
        <Text bold>Border:</Text>
        {BORDER_STYLES.map((style: BorderStyle) => {
          const isSelected = style === borderStyle;
          return (
            <Text
              key={style}
              color={isSelected ? accentColor : "gray"}
              bold={isSelected}
              underline={isSelected}
            >
              {isSelected ? `◆ ${style}` : `◇ ${style}`}
            </Text>
          );
        })}
      </Box>

      <Box
        borderStyle={borderStyle}
        borderColor={accentColor}
        padding={1}
        marginTop={1}
        flexDirection="column"
      >
        <Text bold color={accentColor}>
          {previewProfile.name || "Your Name"} — Preview ({borderStyle})
        </Text>
        <Text color="gray">
          {previewProfile.role || "Your Role / Headline"}
        </Text>
        <Text>
          {previewProfile.bio || "Your short bio will appear here."}
        </Text>
      </Box>
    </Box>
  );
}

export function ReviewStep({
  data,
  saveError,
  onConfirmSave,
  onBack,
}: {
  data: PortfolioData;
  saveError: string | null;
  onConfirmSave: () => void;
  onBack: () => void;
}) {
  const { accentColor, borderStyle } = data.theme;

  useInput((input, key) => {
    if (key.escape) return onBack();
    if (key.return || input === "s" || input === "S") onConfirmSave();
  });

  const contacts = Object.values(data.contact).filter(Boolean);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={accentColor}>
          Review Your Portfolio
        </Text>
      </Box>
      <Text>
        <Text bold>Name:</Text> {data.profile.name}
      </Text>
      <Text>
        <Text bold>Role:</Text> {data.profile.role}
      </Text>
      <Text>
        <Text bold>Bio:</Text> {data.profile.bio}
      </Text>
      <Text>
        <Text bold>Skills:</Text> {data.skills.join(", ")}
      </Text>
      <Text>
        <Text bold>Projects:</Text>{" "}
        {data.projects.map((p) => p.title).join(", ")}
      </Text>
      <Text>
        <Text bold>Contact:</Text>{" "}
        {contacts.length > 0 ? contacts.join(" | ") : "None"}
      </Text>
      <Text>
        <Text bold>Theme:</Text>{" "}
        <Text color={accentColor} bold>
          {accentColor} ({borderStyle})
        </Text>
      </Text>

      {saveError && (
        <Box marginTop={1}>
          <Text color="red" bold>
            ✗ Save failed: {saveError}
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text bold color="black" backgroundColor={accentColor}>
          {" ▸ Press Enter to Save to portfolio.json "}
        </Text>
      </Box>
    </Box>
  );
}

export function SavedScreen({
  filePath,
  accentColor,
  onLaunchPortfolio,
  onExit,
}: {
  filePath: string;
  accentColor: ThemeColor;
  onLaunchPortfolio: () => void;
  onExit: () => void;
}) {
  useInput((input, key) => {
    if (key.return || input === "v" || input === "V") onLaunchPortfolio();
    if (key.escape || input === "q" || input === "Q") onExit();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        borderStyle="round"
        borderColor={accentColor}
        padding={1}
        flexDirection="column"
      >
        <Text bold color="green">
          ✓ Portfolio saved successfully!
        </Text>
        <Text color="gray">Saved to: {filePath}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            Press <Text bold color={accentColor}>Enter</Text> to launch your TUI
            portfolio now, or <Text bold>q</Text> to exit.
          </Text>
          <Text color="gray">
            You can also run `bun start` anytime to view it, or `bun run create`
            to edit it.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
