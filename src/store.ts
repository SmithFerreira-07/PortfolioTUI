//storage boundary: isolates all filesystem reads, writes, and path resolution from ui components
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { normalize, parsePortfolio, type Portfolio } from "./schema.ts";

export const PORTFOLIOS_DIR = resolve(import.meta.dir, "..", "portfolios");

export interface Entry {
  file: string;
  data: Portfolio;
}

export interface Gallery {
  entries: Entry[];
  errors: string[];
}

//load all portfolios in portfolios/, collecting per-file errors so one bad file doesn't break the gallery
export function loadGallery(): Gallery {
  const entries: Entry[] = [];
  const errors: string[] = [];
  const files = existsSync(PORTFOLIOS_DIR)
    ? readdirSync(PORTFOLIOS_DIR).filter((f) => f.endsWith(".json")).sort()
    : [];
  for (const f of files) {
    try {
      entries.push(readEntry(join(PORTFOLIOS_DIR, f)));
    } catch (err) {
      errors.push(`${f}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  entries.sort((a, b) => a.data.name.localeCompare(b.data.name));
  return { entries, errors };
}

//resolve a cli query by direct file path, filename in portfolios/, or slug name
export function findEntry(query: string): Entry | undefined {
  const candidates = [resolve(query), join(PORTFOLIOS_DIR, query), join(PORTFOLIOS_DIR, `${query}.json`)];
  const file = candidates.find((c) => c.endsWith(".json") && existsSync(c));
  return file ? readEntry(file) : undefined;
}

//read and strictly validate a portfolio json file from disk
export function readEntry(file: string): Entry {
  const raw = JSON.parse(readFileSync(file, "utf-8"));
  return { file: resolve(file), data: parsePortfolio(raw) };
}

//normalize, enforce required fields at the write boundary, and persist the portfolio json to disk
export function saveEntry(data: Portfolio, existingFile?: string): Entry {
  const clean = normalize(data);
  if (!clean.name) throw new Error('missing "name"');
  let file = existingFile ? resolve(existingFile) : undefined;
  if (!file) {
    mkdirSync(PORTFOLIOS_DIR, { recursive: true });
    const slug = slugify(clean.name);
    file = join(PORTFOLIOS_DIR, `${slug}.json`);
    for (let n = 2; existsSync(file); n++) file = join(PORTFOLIOS_DIR, `${slug}-${n}.json`);
  }
  writeFileSync(file, JSON.stringify(clean, null, 2) + "\n", "utf-8");
  return { file, data: clean };
}

//format a saved file's display path and cli reopen argument for both built-in and external files
export function describeFile(file: string): { path: string; arg: string } {
  const resolved = resolve(file);
  if (dirname(resolved) === PORTFOLIOS_DIR) {
    return { path: `portfolios/${basename(resolved)}`, arg: basename(resolved, ".json") };
  }
  const rel = relative(process.cwd(), resolved) || resolved;
  return { path: rel, arg: rel };
}

//convert a display name into a lowercase ascii filename slug
function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "portfolio";
}
