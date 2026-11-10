//single-portfolio screen: pairs portfoliocard with async os browser/clipboard actions and only advertises "open" for valid urls
import { spawn } from "node:child_process";
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
      const target = card.target;
      void openUrl(url).then((ok) => flash(ok ? `Opened ${prettyUrl(url)}` : `Can't open ${target}`));
      return;
    }
    if (input === "y" && card.target) {
      void copyText(card.target).then((ok) => flash(ok ? "Copied" : "Couldn't copy"));
      return;
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

//asynchronously open a validated url in the os default browser
async function openUrl(url: string): Promise<boolean> {
  if (process.platform === "darwin") return run("open", [url]);
  if (process.platform === "win32") return run("rundll32", ["url.dll,FileProtocolHandler", url]);
  return run("xdg-open", [url]);
}

//asynchronously copy text via native os clipboard utilities, falling back to osc-52 for ssh/headless sessions
async function copyText(value: string): Promise<boolean> {
  const ok =
    process.platform === "darwin" ? await run("pbcopy", [], value)
    : process.platform === "win32" ? await run("clip", [], value)
    : (await run("wl-copy", [], value)) || (await run("xclip", ["-selection", "clipboard"], value));
  if (!ok) process.stdout.write(`\x1b]52;c;${Buffer.from(value).toString("base64")}\x07`);
  return true;
}

//spawn a child command asynchronously with muted output and resolve whether it succeeded
function run(cmd: string, args: string[], input?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: [input ? "pipe" : "ignore", "ignore", "ignore"] });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}
