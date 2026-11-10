//shared banner component at src/ so both portfoliocard and the wizard's stylestep can render ascii headers without cross-imports
import React, { useEffect, useMemo, useState } from "react";
import { Text, useAnimation } from "ink";
import figlet from "figlet";
import gradient from "gradient-string";
import { FONTS, PALETTES, type FontId, type PaletteId } from "./schema.ts";

export const MOTION = Boolean(process.stdout.isTTY) && !process.env.NO_MOTION && process.env.TERM !== "dumb";

const REVEAL_FRAMES = 12;
type FigletFont = NonNullable<Parameters<typeof figlet.textSync>[1]>["font"];

//render the gradient-colored banner with an optional left-to-right wipe animation
export function Banner({ name, palette, font, maxWidth, animate = MOTION }: {
  name: string;
  palette: PaletteId;
  font: FontId;
  maxWidth: number;
  animate?: boolean;
}) {
  const lines = useMemo(() => layout(name || "Your name", font, maxWidth), [name, font, maxWidth]);
  const width = Math.max(...lines.map((l) => l.length));
  const [done, setDone] = useState(!animate);
  const { frame } = useAnimation({ interval: 35, isActive: !done });

  useEffect(() => {
    if (frame >= REVEAL_FRAMES) setDone(true);
  }, [frame]);

  const shown = done ? width : Math.ceil((width * frame) / REVEAL_FRAMES);
  const body = lines.map((l) => l.slice(0, shown).padEnd(width)).join("\n");
  const paint = gradient([...PALETTES[palette].gradient]);
  return <Text bold={font === "plain"}>{paint.multiline(body)}</Text>;
}

//recursively step down through [font, "small", "plain"] so the banner never wraps or clips on narrow terminals
export function layout(
  name: string,
  font: FontId,
  maxWidth: number,
  fallbacks: readonly FontId[] = [font, "small", "plain"],
): string[] {
  const [candidate, ...rest] = fallbacks;
  if (!candidate) return [name.slice(0, Math.max(1, maxWidth))];
  const lines = render(name, candidate);
  if (Math.max(...lines.map((l) => l.length)) <= maxWidth) return lines;
  return layout(name, font, maxWidth, rest);
}

//render a name into trimmed ascii lines using figlet, falling back to plain text if empty or unsupported
function render(name: string, font: FontId): string[] {
  const figletFont = FONTS[font].figlet;
  if (!figletFont) return [name];
  try {
    const out = figlet.textSync(name, { font: figletFont as FigletFont });
    const lines = out.split("\n").filter((line) => line.trim()).map((line) => line.trimEnd());
    return lines.length ? lines : [name];
  } catch {
    return [name];
  }
}
