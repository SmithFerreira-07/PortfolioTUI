//two-mode list editor ("list" | "edit") for projects and links; notifies wizard on mode switches so bottom keyhints stay accurate
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { Fields, type Field } from "./Fields.tsx";

type Mode<T> = { kind: "list" } | { kind: "edit"; index: number | null; draft: T };

//browse, add, edit, and delete list items using a discriminated mode union to prevent invalid edit/cursor states
export function ListStep<T extends Record<string, string>>({
  noun, fields, emptyItem, required, items, describe, onChange, onNext, onBack, onEditingChange, accent,
}: {
  noun: string;
  fields: readonly Field<keyof T & string>[];
  emptyItem: T;
  required: keyof T & string;
  items: T[];
  describe: (item: T) => string;
  onChange: (items: T[]) => void;
  onNext: () => void;
  onBack: () => void;
  onEditingChange?: (editing: boolean) => void;
  accent: string;
}) {
  const addRow = items.length;
  const continueRow = items.length + 1;
  const [cursor, setCursor] = useState(items.length ? continueRow : addRow);
  const [mode, setMode] = useState<Mode<T>>({ kind: "list" });

  //return from item editing to list navigation and restore list key hints
  const closeEdit = () => {
    setMode({ kind: "list" });
    onEditingChange?.(false);
  };

  //enter edit mode for an existing item index or a fresh copy of emptyitem when index is null
  const startEdit = (index: number | null) => {
    const initial = index !== null && items[index] ? { ...items[index] } : { ...emptyItem };
    setMode({ kind: "edit", index, draft: initial });
    onEditingChange?.(true);
  };

  useInput((input, key) => {
    if (key.escape) return onBack();
    if (key.upArrow || input === "k") return setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow || input === "j" || key.tab) return setCursor((c) => Math.min(continueRow, c + 1));
    if (input === "a") return startEdit(null);
    if (key.return) return cursor === continueRow ? onNext() : startEdit(cursor === addRow ? null : cursor);
    if ((input === "d" || key.backspace || key.delete) && cursor < items.length) {
      const next = items.filter((_, i) => i !== cursor);
      onChange(next);
      return setCursor(Math.min(cursor, Math.max(0, next.length - 1)));
    }
  }, { isActive: mode.kind === "list" });

  if (mode.kind === "edit") {
    //commit the edited draft item into the list and return to list mode
    const save = () => {
      if (mode.index === null) {
        onChange([...items, mode.draft]);
        setCursor(items.length + 1);
      } else {
        onChange(items.map((it, i) => (i === mode.index ? mode.draft : it)));
      }
      closeEdit();
    };
    const editingItem = mode.index !== null ? items[mode.index] : undefined;
    return (
      <Box flexDirection="column" rowGap={1}>
        <Text dimColor>{editingItem ? `Editing ${describe(editingItem)}` : `New ${noun}`}</Text>
        <Fields fields={fields} values={mode.draft} accent={accent} required={[required]}
          onChange={(k, v) => setMode({ ...mode, draft: { ...mode.draft, [k]: v } })}
          onSubmit={save} onEscape={closeEdit} />
      </Box>
    );
  }

  //render a single selectable row in the list view
  const row = (i: number, label: React.ReactNode) => {
    const active = i === cursor;
    return (
      <Text key={i} wrap="truncate" color={active ? accent : undefined} bold={active}>
        {active ? "› " : "  "}{label}
      </Text>
    );
  };

  return (
    <Box flexDirection="column">
      {items.length === 0 ? <Box marginBottom={1}><Text dimColor>  No {noun}s yet. They're optional.</Text></Box> : null}
      {items.map((item, i) => row(i, describe(item)))}
      {row(addRow, `+ Add ${noun}`)}
      <Box marginTop={1}>{row(continueRow, "Continue →")}</Box>
    </Box>
  );
}
