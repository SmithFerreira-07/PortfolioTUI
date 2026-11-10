#!/usr/bin/env bun
//cli boundary: validates flags and tty upfront before touching disk or mounting the ink ui
import React from "react";
import { render } from "ink";
import App, { type Route } from "./src/App.tsx";
import { findEntry, loadGallery } from "./src/store.ts";

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
render(<App initial={await resolveRoute(args)} />);

//asynchronously map cli positional arguments to the initial screen route
async function resolveRoute([command, arg]: string[]): Promise<Route> {
  if (!command) return { screen: "gallery", gallery: await loadGallery() };
  if (command === "new" || command === "create") return { screen: "wizard" };
  if (command === "edit") {
    return arg ? { screen: "wizard", entry: await find(arg) } : fail("Usage: bun start edit <name>");
  }
  return { screen: "view", entry: await find(command), standalone: true };
}

//asynchronously resolve a portfolio query at the cli boundary or exit if missing/invalid
async function find(query: string) {
  try {
    return (await findEntry(query)) ?? fail(`No portfolio called "${query}". Run \`bun start\` to see them all.`);
  } catch (err) {
    fail(`Couldn't read ${query}: ${err instanceof Error ? err.message : err}`);
  }
}

//exit immediately with a user-facing error message
function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
