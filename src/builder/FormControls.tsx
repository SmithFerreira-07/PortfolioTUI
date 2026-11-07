import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { ThemeColor } from "../portfolio.ts";


//this serves as a utility function to cycle through an array of items, given the current item and a delta (1 for next, -1 for previous). It returns the next item in the array, wrapping around if necessary.
export function cycle<T>(
  items: readonly [T, ...T[]],
  current: T,
  delta: 1 | -1
): T {
  const idx = items.indexOf(current);
  const safeIdx = idx === -1 ? 0 : idx;
  const nextIdx = (safeIdx + delta + items.length) % items.length;
  return items[nextIdx]!;
}

//interface for form fields, Ink does not provide a form library
export interface FieldDescriptor<K extends string> {
  readonly key: K;
  readonly label: string;
  readonly placeholder: string;
}

export function TextField({
  label,
  value,
  placeholder,
  active,
  accentColor,
}: {
  label: string;
  value: string;
  placeholder: string;
  active: boolean;
  accentColor: ThemeColor;
}) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold={active} color={active ? accentColor : "white"}>
        {active ? "▸ " : "  "}
        {label}
      </Text>
      <Box
        borderStyle="round"
        borderColor={active ? accentColor : "gray"}
        paddingX={1}
      >
        <Text color={value ? "white" : "gray"}>
          {value || placeholder}
          {active ? "█" : ""}
        </Text>
      </Box>
    </Box>
  );
}

//declarative function to center all children in a box, with optional width and height
export function TextFieldGroup<K extends string>({
  fields,
  values,
  accentColor,
  onChange,
  onSubmit,
  onCancel,
  onEmptyBackspace,
}: {
  fields: readonly [FieldDescriptor<K>, ...FieldDescriptor<K>[]];
  values: Record<K, string>;
  accentColor: ThemeColor;
  onChange: (key: K, nextValue: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onEmptyBackspace?: () => void;
}) {
  const [activeKey, setActiveKey] = useState<K>(fields[0].key);

  useInput((input, key) => {
    if (key.escape) return onCancel();

    const idx = fields.findIndex((f) => f.key === activeKey);
    const safeIdx = idx === -1 ? 0 : idx;
    const currentField = fields[safeIdx]!;
    const currentVal = values[currentField.key] ?? "";

    if (key.upArrow) {
      if (safeIdx > 0) setActiveKey(fields[safeIdx - 1]!.key);
      return;
    }

    if (key.downArrow || key.tab) {
      const nextIdx = key.tab
        ? (safeIdx + 1) % fields.length
        : Math.min(safeIdx + 1, fields.length - 1);
      setActiveKey(fields[nextIdx]!.key);
      return;
    }

    if (key.return) {
      if (safeIdx < fields.length - 1) {
        setActiveKey(fields[safeIdx + 1]!.key);
      } else {
        setActiveKey(fields[0].key);
        onSubmit();
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (currentVal.length > 0) {
        onChange(currentField.key, currentVal.slice(0, -1));
      } else if (safeIdx === 0 && onEmptyBackspace) {
        onEmptyBackspace();
      }
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      onChange(currentField.key, currentVal + input);
    }
  });

  return (
    <Box flexDirection="column">
      {fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={values[field.key]}
          placeholder={field.placeholder}
          active={field.key === activeKey}
          accentColor={accentColor}
        />
      ))}
    </Box>
  );
}

//builder function for a single record of fields
export function RecordStep<K extends string>({
  title,
  fields,
  initialValue,
  accentColor,
  onComplete,
  onBack,
}: {
  title: string;
  fields: readonly [FieldDescriptor<K>, ...FieldDescriptor<K>[]];
  initialValue: Record<K, string>;
  accentColor: ThemeColor;
  onComplete: (result: Record<K, string>) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<Record<K, string>>(initialValue);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>{title}</Text>
      </Box>
      <TextFieldGroup
        fields={fields}
        values={draft}
        accentColor={accentColor}
        onChange={(key, value) =>
          setDraft((prev) => ({ ...prev, [key]: value }))
        }
        onSubmit={() => onComplete(draft)}
        onCancel={onBack}
      />
    </Box>
  );
}

//builder function for skills and projects 
export function ListStep<K extends string, T>({
  title,
  hint,
  fields,
  emptyDraft,
  initialItems,
  accentColor,
  parseDraft,
  renderItems,
  onComplete,
  onBack,
}: {
  title: string;
  hint: string;
  fields: readonly [FieldDescriptor<K>, ...FieldDescriptor<K>[]];
  emptyDraft: Record<K, string>;
  initialItems: T[];
  accentColor: ThemeColor;
  parseDraft: (draft: Record<K, string>) => T[];
  renderItems: (items: T[]) => React.ReactNode;
  onComplete: (items: T[]) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [draft, setDraft] = useState<Record<K, string>>(emptyDraft);

  const handleSubmit = () => {
    const added = parseDraft(draft);
    if (added.length > 0) {
      setItems((prev) => [...prev, ...added]);
      setDraft(emptyDraft);
    } else {
      onComplete(items);
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold>
          {title} ({items.length} added)
        </Text>
        <Text color="gray">{hint}</Text>
      </Box>

      {items.length > 0 && <Box marginBottom={1}>{renderItems(items)}</Box>}

      <TextFieldGroup
        fields={fields}
        values={draft}
        accentColor={accentColor}
        onChange={(key, value) =>
          setDraft((prev) => ({ ...prev, [key]: value }))
        }
        onSubmit={handleSubmit}
        onCancel={onBack}
        onEmptyBackspace={() => setItems((prev) => prev.slice(0, -1))}
      />
    </Box>
  );
}
