//storage boundary: encapsulates async filesystem reads, writes, and recursive path resolution in portfoliostore
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { PortfolioValidationError, normalize, parsePortfolio, type Portfolio } from "./schema.ts";

export const PORTFOLIOS_DIR = resolve(import.meta.dir, "..", "portfolios");

export interface Entry {
  file: string;
  data: Portfolio;
}

export interface Gallery {
  entries: Entry[];
  errors: string[];
}

//class managing portfolio persistence, recursive directory discovery, and collision-safe file naming
export class PortfolioStore {
  readonly dir: string;

  constructor(dir: string = PORTFOLIOS_DIR) {
    this.dir = resolve(dir);
  }

  //recursively load all portfolios under this.dir, collecting per-file errors so one bad file doesn't break the gallery
  async loadGallery(): Promise<Gallery> {
    const entries: Entry[] = [];
    const errors: string[] = [];
    const files = (await this.exists(this.dir)) ? (await this.collectJsonFiles(this.dir)).sort() : [];
    for (const file of files) {
      try {
        entries.push(await this.readEntry(file));
      } catch (err) {
        const label = relative(this.dir, file) || basename(file);
        const detail = err instanceof PortfolioValidationError || err instanceof Error ? err.message : String(err);
        errors.push(`${label}: ${detail}`);
      }
    }
    entries.sort((a, b) => a.data.name.localeCompare(b.data.name));
    return { entries, errors };
  }

  //resolve a cli query by direct file path, filename in this.dir, or slug name
  async findEntry(query: string): Promise<Entry | undefined> {
    const candidates = [resolve(query), join(this.dir, query), join(this.dir, `${query}.json`)];
    for (const candidate of candidates) {
      if (candidate.endsWith(".json") && (await this.exists(candidate))) {
        return this.readEntry(candidate);
      }
    }
    return undefined;
  }

  //asynchronously read and strictly validate a portfolio json file from disk
  async readEntry(file: string): Promise<Entry> {
    const text = await readFile(file, "utf-8");
    const raw = JSON.parse(text);
    return { file: resolve(file), data: parsePortfolio(raw) };
  }

  //normalize, enforce required fields at the write boundary, and persist the portfolio json to disk
  async saveEntry(data: Portfolio, existingFile?: string): Promise<Entry> {
    const clean = normalize(data);
    if (!clean.name) throw new PortfolioValidationError("name", 'missing "name"');
    let file = existingFile ? resolve(existingFile) : undefined;
    if (!file) {
      await mkdir(this.dir, { recursive: true });
      file = await this.findAvailablePath(slugify(clean.name));
    }
    await writeFile(file, JSON.stringify(clean, null, 2) + "\n", "utf-8");
    return { file, data: clean };
  }

  //format a saved file's display path and cli reopen argument for both built-in and external files
  describeFile(file: string): { path: string; arg: string } {
    const resolved = resolve(file);
    const relToStore = relative(this.dir, resolved);
    if (relToStore && !relToStore.startsWith("..") && !relToStore.includes("/")) {
      return { path: `portfolios/${basename(resolved)}`, arg: basename(resolved, ".json") };
    }
    const rel = relative(process.cwd(), resolved) || resolved;
    return { path: rel, arg: rel };
  }

  //recursively walk a directory tree and collect all .json file paths
  private async collectJsonFiles(dir: string): Promise<string[]> {
    const items = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      items.map(async (item): Promise<string[]> => {
        const fullPath = join(dir, item.name);
        if (item.isDirectory()) return this.collectJsonFiles(fullPath);
        if (item.isFile() && item.name.endsWith(".json")) return [fullPath];
        return [];
      }),
    );
    return nested.flat();
  }

  //recursively increment the numeric suffix until an unused filename in this.dir is found
  private async findAvailablePath(slug: string, attempt = 1): Promise<string> {
    const filename = attempt === 1 ? `${slug}.json` : `${slug}-${attempt}.json`;
    const candidate = join(this.dir, filename);
    if (!(await this.exists(candidate))) return candidate;
    return this.findAvailablePath(slug, attempt + 1);
  }

  //check whether a path exists on disk asynchronously
  private async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
}

export const defaultStore = new PortfolioStore(PORTFOLIOS_DIR);

//load all portfolios from the default store
export async function loadGallery(): Promise<Gallery> {
  return defaultStore.loadGallery();
}

//find a portfolio entry by query in the default store
export async function findEntry(query: string): Promise<Entry | undefined> {
  return defaultStore.findEntry(query);
}

//read and validate a portfolio file via the default store
export async function readEntry(file: string): Promise<Entry> {
  return defaultStore.readEntry(file);
}

//save a portfolio entry via the default store
export async function saveEntry(data: Portfolio, existingFile?: string): Promise<Entry> {
  return defaultStore.saveEntry(data, existingFile);
}

//describe a saved portfolio file path via the default store
export function describeFile(file: string): { path: string; arg: string } {
  return defaultStore.describeFile(file);
}

//convert a display name into a lowercase ascii filename slug
function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "portfolio";
}
