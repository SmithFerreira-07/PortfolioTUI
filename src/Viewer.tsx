//single-portfolio screen: pairs portfoliocard with os browser/clipboard actions and only advertises "open" for valid urls
import { spawnSync } from "node:child_process";
import React from "react";
import { Box, useApp, useInput } from "ink";
import { KeyHints, useFlash, type Hint } from "./KeyHints.tsx";
import { PortfolioCard, useCardState } from "./PortfolioCard.tsx";
import { accentOf, prettyUrl, toUrl, type Portfolio } from "./schema.ts";

//render the interactive portfolio viewer with open, copy, edit, and back/quit bindings
export function Viewer({ data, onBack, onEdit }: {
  data: Portfolio;
  onBack?: () => void;
  onEdit?: () => void;
}) {
  const { exit } = useApp();
  const card = useCardState(data);
  const [status, flash] = useFlash();
  const url = card.target ? toUrl(card.target) : null;

  useInput((input, key) => {
    if (input === "q") return exit();
    if (key.escape) return onBack ? onBack() : exit();
    if (input === "e" && onEdit) return onEdit();
    if ((key.return || input === "o") && url) {
      return flash(openUrl(url) ? `Opened ${prettyUrl(url)}` : `Can't open ${card.target}`);
    }
    if (input === "y" && card.target) {
      return flash(copyText(card.target) ? "Copied" : "Couldn't copy");
    }
  });

  const hints: Hint[] = [["tab", "section"]];
  if (card.selected !== null) hints.push(["↑↓", "select"]);
  if (url) hints.push(["o", "open"]);
  if (card.target) hints.push(["y", "copy"]);
  if (onEdit) hints.push(["e", "edit"]);
  hints.push(onBack ? ["esc", "back"] : ["q", "quit"]);

  return (
    <Box flexDirection="column">
      <PortfolioCard data={data} {...card} />
      <KeyHints hints={hints} status={status} accent={accentOf(data)} />
    </Box>
  );
}

//open a validated url in the os default browser
function openUrl(url: string): boolean {
  if (process.platform === "darwin") return run("open", [url]);
  if (process.platform === "win32") return run("rundll32", ["url.dll,FileProtocolHandler", url]);
  return run("xdg-open", [url]);
}

//copy text via native os clipboard utilities, falling back to osc-52 for ssh/headless sessions
function copyText(value: string): boolean {
  const ok =
    process.platform === "darwin" ? run("pbcopy", [], value)
    : process.platform === "win32" ? run("clip", [], value)
    : run("wl-copy", [], value) || run("xclip", ["-selection", "clipboard"], value);
  if (!ok) process.stdout.write(`\x1b]52;c;${Buffer.from(value).toString("base64")}\x07`);
  return true;
}

//spawn a child command synchronously with muted output and return whether it succeeded
function run(cmd: string, args: string[], input?: string): boolean {
  return spawnSync(cmd, args, { input, stdio: [input ? "pipe" : "ignore", "ignore", "ignore"] }).status === 0;
}
