#!/usr/bin/env bun
//cli boundary: validates flags and tty upfront before touching disk or mounting the ink ui
import React from "react";
import { render } from "ink";
import App, { type Route } from "./src/App.tsx";
import { findEntry } from "./src/store.ts";

const HELP = `Terminal portfolios

  bun start              browse the gallery
  bun start <name>       open one portfolio (e.g. devon-ai, or a path to a .json file)
  bun start new          add your portfolio with the wizard
  bun start edit <name>  edit an existing portfolio

Set NO_MOTION=1 to turn off the banner animation.`;

const args = process.argv.slice(2);
if (args[0] === "--help" || args[0] === "-h" || args[0] === "help") {
  console.log(HELP);
  process.exit(0);
}
if (args[0]?.startsWith("-")) fail(`Unknown option "${args[0]}". Run \`bun start --help\` for usage.`);
if (!process.stdin.isTTY) fail("This is an interactive app. Run it in a terminal.");
render(<App initial={resolveRoute(args)} />);

//map cli positional arguments to the initial screen route
function resolveRoute([command, arg]: string[]): Route | undefined {
  if (!command) return undefined;
  if (command === "new" || command === "create") return { screen: "wizard" };
  if (command === "edit") return arg ? { screen: "wizard", entry: find(arg) } : fail("Usage: bun start edit <name>");
  return { screen: "view", entry: find(command), standalone: true };
}

//resolve a portfolio query at the cli boundary or exit if missing/invalid
function find(query: string) {
  try {
    return findEntry(query) ?? fail(`No portfolio called "${query}". Run \`bun start\` to see them all.`);
  } catch (err) {
    fail(`Couldn't read ${query}: ${err instanceof Error ? err.message : err}`);
  }
}

//exit immediately with a user-facing error message
function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
