import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";

export const PORTFOLIO_FILE = resolve(process.cwd(), "portfolio.json");
export const PORTFOLIOS_DIR = resolve(process.cwd(), "portfolios");

export const THEME_COLORS = [
  "cyan",
  "green",
  "magenta",
  "yellow",
  "blue",
  "red",
  "white",
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number];

export const BORDER_STYLES = [
  "single",
  "round",
  "double",
  "bold",
  "classic",
] as const;

export type BorderStyle = (typeof BORDER_STYLES)[number];

export interface ProfileInfo {
  name: string;
  role: string;
  bio: string;
}

export interface ProjectItem {
  title: string;
  description: string;
  link: string;
}

export interface ContactInfo {
  github: string;
  email: string;
  website: string;
  socials: string;
}

export interface ThemeConfig {
  accentColor: ThemeColor;
  borderStyle: BorderStyle;
}

export interface PortfolioData {
  profile: ProfileInfo;
  skills: string[];
  projects: ProjectItem[];
  contact: ContactInfo;
  theme: ThemeConfig;
}

export interface PortfolioEntry {
  id: string;
  fileName: string;
  filePath: string;
  isUserCustom: boolean;
  data: PortfolioData;
}

export const DEFAULT_PORTFOLIO: PortfolioData = {
  profile: {
    name: "kyrie",
    role: "cs student & developer",
    bio: "wip terminal portfolio. Run `bun run create` to customize your own TUI portfolio!",
  },
  skills: ["TypeScript", "React", "Bun", "Ink TUI"],
  projects: [
    {
      title: "portfolio-cli",
      description: "Interactive terminal portfolio & TUI builder",
      link: "https://github.com/...",
    },
  ],
  contact: {
    github: "github.com/...",
    email: "hello@example.com",
    website: "",
    socials: "",
  },
  theme: { accentColor: "cyan", borderStyle: "single" },
};

export const EMPTY_DRAFT: PortfolioData = {
  profile: { name: "", role: "", bio: "" },
  skills: [],
  projects: [],
  contact: { github: "", email: "", website: "", socials: "" },
  theme: { accentColor: "cyan", borderStyle: "round" },
};

export type PortfolioSource =
  | { status: "custom"; data: PortfolioData; filePath: string }
  | { status: "default"; data: PortfolioData }
  | { status: "invalid_file"; data: PortfolioData; error: string };

export type SaveResult =
  | { ok: true; data: PortfolioData; filePath: string }
  | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const cleanStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

/**
 * Single boundary normalizer used for both untrusted JSON and user form drafts.
 */
export function normalizePortfolio(raw: unknown): PortfolioData {
  const root = isRecord(raw) ? raw : {};
  const profile = isRecord(root.profile) ? root.profile : {};
  const contact = isRecord(root.contact) ? root.contact : {};
  const theme = isRecord(root.theme) ? root.theme : {};

  const skills = Array.isArray(root.skills)
    ? root.skills.map((s) => cleanStr(s)).filter(Boolean)
    : [];

  const projects = Array.isArray(root.projects)
    ? root.projects
        .filter(isRecord)
        .map((p) => ({
          title: cleanStr(p.title),
          description: cleanStr(p.description, "No description provided"),
          link: cleanStr(p.link),
        }))
        .filter((p) => p.title.length > 0)
    : [];

  const accent = theme.accentColor;
  const accentColor: ThemeColor =
    typeof accent === "string" &&
    (THEME_COLORS as readonly string[]).includes(accent)
      ? (accent as ThemeColor)
      : DEFAULT_PORTFOLIO.theme.accentColor;

  const border = theme.borderStyle;
  const borderStyle: BorderStyle =
    typeof border === "string" &&
    (BORDER_STYLES as readonly string[]).includes(border)
      ? (border as BorderStyle)
      : DEFAULT_PORTFOLIO.theme.borderStyle;

  return {
    profile: {
      name: cleanStr(profile.name, DEFAULT_PORTFOLIO.profile.name),
      role: cleanStr(profile.role, DEFAULT_PORTFOLIO.profile.role),
      bio: cleanStr(profile.bio, DEFAULT_PORTFOLIO.profile.bio),
    },
    skills: skills.length > 0 ? skills : DEFAULT_PORTFOLIO.skills,
    projects: projects.length > 0 ? projects : DEFAULT_PORTFOLIO.projects,
    contact: {
      github: cleanStr(contact.github),
      email: cleanStr(contact.email),
      website: cleanStr(contact.website),
      socials: cleanStr(contact.socials),
    },
    theme: { accentColor, borderStyle },
  };
}

export function loadPortfolio(filePath = PORTFOLIO_FILE): PortfolioSource {
  if (!existsSync(filePath)) {
    return { status: "default", data: DEFAULT_PORTFOLIO };
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
    if (!isRecord(parsed)) {
      return {
        status: "invalid_file",
        data: DEFAULT_PORTFOLIO,
        error: "Root JSON value must be an object",
      };
    }
    return {
      status: "custom",
      data: normalizePortfolio(parsed),
      filePath,
    };
  } catch (err) {
    return {
      status: "invalid_file",
      data: DEFAULT_PORTFOLIO,
      error: err instanceof Error ? err.message : "Invalid portfolio.json",
    };
  }
}

/**
 * Loads all selectable portfolios from `portfolio.json` (if created) and `portfolios/*.json`.
 */
export function loadPortfolioCatalog(): [PortfolioEntry, ...PortfolioEntry[]] {
  const entries: PortfolioEntry[] = [];

  if (existsSync(PORTFOLIO_FILE)) {
    const custom = loadPortfolio(PORTFOLIO_FILE);
    if (custom.status === "custom") {
      entries.push({
        id: "custom-root",
        fileName: "portfolio.json (My Custom Portfolio)",
        filePath: PORTFOLIO_FILE,
        isUserCustom: true,
        data: custom.data,
      });
    }
  }

  if (existsSync(PORTFOLIOS_DIR)) {
    const files = readdirSync(PORTFOLIOS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();

    for (const file of files) {
      const fullPath = resolve(PORTFOLIOS_DIR, file);
      const loaded = loadPortfolio(fullPath);
      if (loaded.status === "custom") {
        entries.push({
          id: file,
          fileName: basename(file, ".json"),
          filePath: fullPath,
          isUserCustom: false,
          data: loaded.data,
        });
      }
    }
  }

  if (entries.length === 0) {
    return [
      {
        id: "default",
        fileName: "default",
        filePath: PORTFOLIO_FILE,
        isUserCustom: false,
        data: DEFAULT_PORTFOLIO,
      },
    ];
  }

  return entries as [PortfolioEntry, ...PortfolioEntry[]];
}

export function savePortfolio(
  draft: PortfolioData,
  filePath = PORTFOLIO_FILE
): SaveResult {
  const data = normalizePortfolio(draft);
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    return { ok: true, data, filePath };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to write file",
    };
  }
}
