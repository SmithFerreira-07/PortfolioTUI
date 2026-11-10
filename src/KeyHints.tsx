//shared footer bar and transient flash message hook used across gallery, viewer, and wizard
import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";

export type Hint = readonly [key: string, label: string];

//render the bottom row of keyboard shortcuts and an optional right-aligned status message
export function KeyHints({ hints, status, accent }: { hints: readonly Hint[]; status?: string; accent: string }) {
  return (
    <Box justifyContent="space-between" paddingX={1} columnGap={2}>
      <Box flexWrap="wrap" columnGap={2}>
        {hints.map(([key, label]) => (
          <Text key={key + label} wrap="truncate">
            <Text bold>{key}</Text> <Text dimColor>{label}</Text>
          </Text>
        ))}
      </Box>
      {status ? <Text color={accent} wrap="truncate">{status}</Text> : null}
    </Box>
  );
}

//store a temporary status string that automatically clears after durationms
export function useFlash(durationMs = 2500): [string, (message: string) => void] {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);
  return [message, setMessage];
}
