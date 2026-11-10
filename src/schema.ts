//leaf domain layer: defines portfolio types, strict boundary parsing, draft normalization, and url rules with zero ui/io imports
import stripAnsi from "strip-ansi";

export const PALETTES = {
  ocean: { label: "Ocean", accent: "#4cc9f0", gradient: ["#7df9ff", "#4cc9f0", "#4361ee"] },
  forest: { label: "Forest", accent: "#52d69a", gradient: ["#d4fc79", "#52d69a", "#1b998b"] },
  sunset: { label: "Sunset", accent: "#ff9e64", gradient: ["#ffd166", "#ff9e64", "#ef476f"] },
  grape: { label: "Grape", accent: "#c792ea", gradient: ["#ff9ff3", "#c792ea", "#7c5cff"] },
  ember: { label: "Ember", accent: "#ff6b6b", gradient: ["#ffb199", "#ff6b6b", "#c9184a"] },
  mono: { label: "Mono", accent: "#d4d4d4", gradient: ["#ffffff", "#b0b0b0", "#707070"] },
} as const satisfies Record<string, { label: string; accent: string; gradient: readonly string[] }>;

export const FONTS = {
  small: { label: "Small", figlet: "Small" },
  slant: { label: "Slant", figlet: "Slant" },
  standard: { label: "Standard", figlet: "Standard" },
  shadow: { label: "Shadow", figlet: "ANSI Shadow" },
  calvin: { label: "Calvin", figlet: "Calvin S" },
  plain: { label: "Plain text", figlet: null },
} as const satisfies Record<string, { label: string; figlet: string | null }>;

export type PaletteId = keyof typeof PALETTES;
export type FontId = keyof typeof FONTS;
export const PALETTE_IDS = Object.keys(PALETTES) as [PaletteId, ...PaletteId[]];
export const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]];

export type Project = {
  title: string;
  description: string;
  link: string;
};

export type Link = {
  label: string;
  url: string;
};

export interface Portfolio {
  name: string;
  role: string;
  bio: string;
  skills: string[];
  projects: Project[];
  links: Link[];
  theme: { palette: PaletteId; font: FontId };
}

export const EMPTY_PORTFOLIO: Portfolio = {
  name: "",
  role: "",
  bio: "",
  skills: [],
  projects: [],
  links: [],
  theme: { palette: "ocean", font: "small" },
};

//structured error class thrown when a portfolio json file fails schema validation
export class PortfolioValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "PortfolioValidationError";
    this.field = field;
  }
}

//look up the primary accent hex color for a portfolio's chosen palette
export function accentOf(p: Portfolio): string {
  return PALETTES[p.theme.palette].accent;
}

//strictly validate untrusted json at the disk-read boundary so hand-edited files get clear error messages
export function parsePortfolio(raw: unknown): Portfolio {
  if (!isRecord(raw)) throw new PortfolioValidationError("root", "portfolio must be a JSON object");
  const name = cleanText(raw.name);
  if (!name) throw new PortfolioValidationError("name", 'missing "name"');

  if (raw.skills !== undefined && !Array.isArray(raw.skills)) {
    throw new PortfolioValidationError("skills", '"skills" must be an array');
  }
  if (raw.projects !== undefined && !Array.isArray(raw.projects)) {
    throw new PortfolioValidationError("projects", '"projects" must be an array');
  }
  if (raw.links !== undefined && !Array.isArray(raw.links)) {
    throw new PortfolioValidationError("links", '"links" must be an array');
  }
  if (raw.theme !== undefined && !isRecord(raw.theme)) {
    throw new PortfolioValidationError("theme", '"theme" must be an object');
  }

  const theme = isRecord(raw.theme) ? raw.theme : {};
  const projects = (raw.projects ?? []).map((p, i) => {
    if (!isRecord(p) || !cleanText(p.title)) {
      throw new PortfolioValidationError(`projects[${i}].title`, `project #${i + 1} is missing "title"`);
    }
    return { title: cleanText(p.title), description: cleanText(p.description), link: cleanText(p.link) };
  });
  const links = (raw.links ?? []).map((l, i) => {
    if (!isRecord(l) || !cleanText(l.url)) {
      throw new PortfolioValidationError(`links[${i}].url`, `link #${i + 1} is missing "url"`);
    }
    return { label: cleanText(l.label), url: cleanText(l.url) };
  });

  return {
    name,
    role: cleanText(raw.role),
    bio: cleanText(raw.bio),
    skills: (raw.skills ?? []).map(cleanText).filter(Boolean),
    projects,
    links,
    theme: {
      palette: parseOption(theme.palette, PALETTE_IDS, EMPTY_PORTFOLIO.theme.palette, "theme.palette"),
      font: parseOption(theme.font, FONT_IDS, EMPTY_PORTFOLIO.theme.font, "theme.font"),
    },
  };
}

//sanitize an in-memory wizard draft and drop incomplete items before previewing or saving
export function normalize(draft: Portfolio): Portfolio {
  return {
    name: cleanText(draft.name),
    role: cleanText(draft.role),
    bio: cleanText(draft.bio),
    skills: draft.skills.map(cleanText).filter(Boolean),
    projects: draft.projects
      .map((p) => ({ title: cleanText(p.title), description: cleanText(p.description), link: cleanText(p.link) }))
      .filter((p) => p.title),
    links: draft.links
      .map((l) => ({ label: cleanText(l.label), url: cleanText(l.url) }))
      .filter((l) => l.url),
    theme: {
      palette: PALETTE_IDS.includes(draft.theme.palette) ? draft.theme.palette : EMPTY_PORTFOLIO.theme.palette,
      font: FONT_IDS.includes(draft.theme.font) ? draft.theme.font : EMPTY_PORTFOLIO.theme.font,
    },
  };
}

//strip ansi/control characters and collapse whitespace so all text stays single-line safe in the terminal
export function cleanText(v: unknown): string {
  return typeof v === "string"
    ? stripAnsi(v).replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

//split comma-separated skill input into sanitized, non-empty tags
export function splitSkills(value: string): string[] {
  return value.split(",").map(cleanText).filter(Boolean);
}

//parse a link string into an openable http/https/mailto url, or return null for @handles and non-urls
export function toUrl(value: string): string | null {
  if (!value || value.startsWith("@") || /\s/.test(value)) return null;
  const candidate = /^[^@/\s]+@[^@/\s]+\.[^@/\s]+$/.test(value)
    ? `mailto:${value}`
    : /^[a-z][a-z\d+.-]*:/i.test(value)
      ? value
      : `https://${value}`;
  const url = URL.parse(candidate);
  if (!url || !["http:", "https:", "mailto:"].includes(url.protocol)) return null;
  if (url.protocol !== "mailto:" && !url.hostname.includes(".")) return null;
  return url.href;
}

//strip protocol, www., and trailing slash for compact terminal display
export function prettyUrl(value: string): string {
  return value.replace(/^(https?:\/\/|mailto:)/, "").replace(/^www\./, "").replace(/\/$/, "");
}

//narrow an unknown json value to a plain key-value object
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

//validate an optional string enum field at the json boundary, throwing on typos instead of silently coercing
function parseOption<T extends string>(v: unknown, options: readonly T[], fallback: T, field: string): T {
  if (v === undefined) return fallback;
  if (typeof v === "string" && options.includes(v as T)) return v as T;
  throw new PortfolioValidationError(field, `invalid ${field} "${String(v)}" (expected ${options.join(", ")})`);
}
