//reusable multi-field form controller and single-line text input widget co-located in src/wizard/
import React, { useState } from "react";
import { Box, Text, useInput, usePaste } from "ink";
import { cleanText } from "../schema.ts";

export interface Field<K extends string> {
  key: K;
  label: string;
  placeholder: string;
}

//manage vertical field focus, cleantext-aligned required validation, and enter/esc progression
export function Fields<K extends string>({ fields, values, onChange, onSubmit, onEscape, accent, required = [], active = true }: {
  fields: readonly Field<K>[];
  values: Record<K, string>;
  onChange: (key: K, value: string) => void;
  onSubmit: () => void;
  onEscape: () => void;
  accent: string;
  required?: readonly K[];
  active?: boolean;
}) {
  const [focus, setFocus] = useState(0);
  const [missing, setMissing] = useState<K | null>(null);
  const last = fields.length - 1;

  //check whether a required field is empty after applying the same sanitizer used on save
  const isEmpty = (k: K) => required.includes(k) && !cleanText(values[k]);

  useInput((_input, key) => {
    if (key.escape) return onEscape();
    if (key.upArrow || (key.tab && key.shift)) return setFocus((f) => Math.max(0, f - 1));
    if (key.downArrow || key.tab) return setFocus((f) => Math.min(last, f + 1));
    if (!key.return) return;
    const current = fields[focus]!.key;
    if (isEmpty(current)) return setMissing(current);
    if (focus < last) return setFocus(focus + 1);
    const firstEmpty = fields.findIndex((f) => isEmpty(f.key));
    if (firstEmpty >= 0) {
      setFocus(firstEmpty);
      return setMissing(fields[firstEmpty]!.key);
    }
    onSubmit();
  }, { isActive: active });

  return (
    <Box flexDirection="column" rowGap={1}>
      {fields.map((field, i) => {
        const focused = active && i === focus;
        return (
          <Box key={field.key} flexDirection="column">
            <Text color={focused ? accent : undefined} bold={focused} dimColor={!focused}>
              {focused ? "› " : "  "}{field.label}
              {missing === field.key && isEmpty(field.key) ? <Text color="red"> · required</Text> : null}
            </Text>
            <Box paddingLeft={2}>
              <TextInput value={values[field.key]} placeholder={field.placeholder} active={focused}
                onChange={(value) => onChange(field.key, value)} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

//render an editable text line with cursor navigation, paste sanitization, and an inverse block cursor
export function TextInput({ value, onChange, placeholder, active }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  active: boolean;
}) {
  const [cursor, setCursor] = useState(value.length);
  const at = Math.min(cursor, value.length);

  //splice sanitized single-line text at the current cursor position
  const insert = (text: string) => {
    const clean = text.replace(/[\r\n\t]+/g, " ");
    onChange(value.slice(0, at) + clean + value.slice(at));
    setCursor(at + clean.length);
  };

  useInput((input, key) => {
    if (key.return || key.tab || key.escape || key.upArrow || key.downArrow) return;
    if (key.leftArrow) return setCursor(Math.max(0, at - 1));
    if (key.rightArrow) return setCursor(Math.min(value.length, at + 1));
    if (key.home || (key.ctrl && input === "a")) return setCursor(0);
    if (key.end || (key.ctrl && input === "e")) return setCursor(value.length);
    if (key.ctrl && input === "u") {
      onChange(value.slice(at));
      return setCursor(0);
    }
    if (key.backspace) {
      if (at === 0) return;
      onChange(value.slice(0, at - 1) + value.slice(at));
      return setCursor(at - 1);
    }
    if (key.delete) return onChange(value.slice(0, at) + value.slice(at + 1));
    if (input && !key.ctrl && !key.meta) insert(input);
  }, { isActive: active });

  usePaste(insert, { isActive: active });

  if (!active) return value ? <Text>{value}</Text> : <Text dimColor>{placeholder}</Text>;
  if (!value) {
    return <Text><Text inverse>{placeholder[0] ?? " "}</Text><Text dimColor>{placeholder.slice(1)}</Text></Text>;
  }
  return (
    <Text>
      {value.slice(0, at)}
      <Text inverse>{value[at] ?? " "}</Text>
      {value.slice(at + 1)}
    </Text>
  );
}
