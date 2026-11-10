import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { layout } from "./Banner.tsx";
import { cycleIndex, windowFor } from "./PortfolioCard.tsx";
import {
  EMPTY_PORTFOLIO,
  PortfolioValidationError,
  normalize,
  parsePortfolio,
  prettyUrl,
  splitSkills,
  toUrl,
} from "./schema.ts";
import { PortfolioStore, describeFile, loadGallery, readEntry, saveEntry } from "./store.ts";

describe("parsePortfolio boundary validation", () => {
  test("loads all built-in gallery portfolios without error", async () => {
    const gallery = await loadGallery();
    expect(gallery.errors).toEqual([]);
    expect(gallery.entries.length).toBeGreaterThanOrEqual(6);
  });

  test("rejects non-objects and missing names with PortfolioValidationError", () => {
    expect(() => parsePortfolio(null)).toThrow("portfolio must be a JSON object");
    expect(() => parsePortfolio([])).toThrow("portfolio must be a JSON object");
    expect(() => parsePortfolio({ name: "   " })).toThrow('missing "name"');

    try {
      parsePortfolio({ name: "   " });
    } catch (err) {
      expect(err).toBeInstanceOf(PortfolioValidationError);
      expect((err as PortfolioValidationError).field).toBe("name");
    }
  });

  test("rejects unknown palettes, fonts, and malformed items", () => {
    expect(() => parsePortfolio({ name: "Ada", theme: { palette: "neon" } })).toThrow('invalid theme.palette "neon"');
    expect(() => parsePortfolio({ name: "Ada", theme: { font: "comic" } })).toThrow('invalid theme.font "comic"');
    expect(() => parsePortfolio({ name: "Ada", projects: [{ description: "no title" }] })).toThrow(
      'project #1 is missing "title"',
    );
    expect(() => parsePortfolio({ name: "Ada", links: [{ label: "GitHub" }] })).toThrow(
      'link #1 is missing "url"',
    );
  });
});

describe("normalize and splitSkills", () => {
  test("strips ANSI sequences, control chars, and blank entries", () => {
    const dirty = {
      ...EMPTY_PORTFOLIO,
      name: "  \u001b[31mAda\u001b[0m\nLovelace  ",
      skills: [" TypeScript ", "", "  Rust\t"],
      projects: [
        { title: " Engine ", description: " Fast ", link: " github.com/ada/engine " },
        { title: "   ", description: "ignored", link: "" },
      ],
      links: [
        { label: " GitHub ", url: " github.com/ada " },
        { label: "Empty", url: "   " },
      ],
    };
    const clean = normalize(dirty);
    expect(clean.name).toBe("Ada Lovelace");
    expect(clean.skills).toEqual(["TypeScript", "Rust"]);
    expect(clean.projects).toEqual([{ title: "Engine", description: "Fast", link: "github.com/ada/engine" }]);
    expect(clean.links).toEqual([{ label: "GitHub", url: "github.com/ada" }]);
  });

  test("splits comma-separated skills cleanly", () => {
    expect(splitSkills(" TypeScript, , Rust , Go ")).toEqual(["TypeScript", "Rust", "Go"]);
  });
});

describe("URL parsing and formatting", () => {
  test("resolves web URLs and emails while rejecting handles and bare words", () => {
    expect(toUrl("github.com/ada")).toBe("https://github.com/ada");
    expect(toUrl("https://ada.dev")).toBe("https://ada.dev/");
    expect(toUrl("ada@AnalyticalEngine.org")).toBe("mailto:ada@AnalyticalEngine.org");
    expect(toUrl("@ada_lovelace")).toBeNull();
    expect(toUrl("@mira@fosstodon.org")).toBeNull();
    expect(toUrl("not-a-domain")).toBeNull();
  });

  test("formats URLs for display", () => {
    expect(prettyUrl("https://www.github.com/ada/")).toBe("github.com/ada");
    expect(prettyUrl("mailto:ada@example.com")).toBe("ada@example.com");
  });
});

describe("viewport windowing and index cycling", () => {
  test("never produces negative start indices when count < maxVisible", () => {
    expect(windowFor(1, 0, 5)).toEqual({ start: 0, end: 1 });
    expect(windowFor(2, 1, 5)).toEqual({ start: 0, end: 2 });
  });

  test("scrolls window as selection advances", () => {
    expect(windowFor(6, 0, 3)).toEqual({ start: 0, end: 3 });
    expect(windowFor(6, 2, 3)).toEqual({ start: 0, end: 3 });
    expect(windowFor(6, 3, 3)).toEqual({ start: 1, end: 4 });
    expect(windowFor(6, 5, 3)).toEqual({ start: 3, end: 6 });
  });

  test("wraps indices in both directions", () => {
    expect(cycleIndex(0, -1, 4)).toBe(3);
    expect(cycleIndex(3, 1, 4)).toBe(0);
    expect(cycleIndex(0, 1, 0)).toBe(0);
  });
});

describe("store persistence, recursion, and PortfolioStore class", () => {
  test("saves, reloads, and describes external files accurately", async () => {
    const dir = mkdtempSync(join(tmpdir(), "portfolio-tui-"));
    try {
      const target = join(dir, "custom.json");
      const saved = await saveEntry({ ...EMPTY_PORTFOLIO, name: "Ada Lovelace" }, target);
      const loaded = await readEntry(saved.file);
      expect(loaded.data.name).toBe("Ada Lovelace");
      expect(describeFile(saved.file).path).not.toStartWith("portfolios/");
      expect(saveEntry(EMPTY_PORTFOLIO, target)).rejects.toThrow('missing "name"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("recursively discovers nested portfolios and resolves filename collisions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "portfolio-tui-store-"));
    try {
      const store = new PortfolioStore(dir);
      const first = await store.saveEntry({ ...EMPTY_PORTFOLIO, name: "Grace Hopper" });
      const second = await store.saveEntry({ ...EMPTY_PORTFOLIO, name: "Grace Hopper" });
      expect(first.file).toEndWith("grace-hopper.json");
      expect(second.file).toEndWith("grace-hopper-2.json");

      const nestedDir = join(dir, "featured", "systems");
      mkdirSync(nestedDir, { recursive: true });
      await store.saveEntry({ ...EMPTY_PORTFOLIO, name: "Margaret Hamilton" }, join(nestedDir, "margaret.json"));

      const gallery = await store.loadGallery();
      expect(gallery.errors).toEqual([]);
      expect(gallery.entries.map((e) => e.data.name)).toEqual([
        "Grace Hopper",
        "Grace Hopper",
        "Margaret Hamilton",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("recursively steps down banner fonts to fit narrow widths", () => {
    const narrow = layout("Ada Lovelace", "standard", 12);
    expect(narrow).toEqual(["Ada Lovelace"]);
    const clipped = layout("Ada Lovelace", "standard", 3);
    expect(clipped).toEqual(["Ada"]);
  });
});
