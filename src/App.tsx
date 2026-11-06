import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";

const tabs = ["about", "projects", "contact"] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("about");

  useInput((input, key) => {
    if (input === "q") {
      exit();
    }

    if (key.rightArrow || key.tab) {
      const next = (tabs.indexOf(activeTab) + 1) % tabs.length;
      setActiveTab(tabs[next]!);
    }

    if (key.leftArrow) {
      const prev = (tabs.indexOf(activeTab) - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prev]!);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          portfolio-cli
        </Text>
      </Box>

      <Box gap={2} marginBottom={1}>
        {tabs.map((tab) => (
          <Text
            key={tab}
            color={activeTab === tab ? "green" : "gray"}
            bold={activeTab === tab}
            underline={activeTab === tab}
          >
            {tab}
          </Text>
        ))}
      </Box>

      <Box borderStyle="single" padding={1} minHeight={8} flexDirection="column">
        {activeTab === "about" && (
          <Box flexDirection="column">
            <Text>hi, i'm kyrie.</Text>
            <Text color="gray">cs student & developer. wip terminal portfolio.</Text>
          </Box>
        )}

        {activeTab === "projects" && (
          <Box flexDirection="column">
            <Text>- project 1 (todo)</Text>
            <Text>- project 2 (todo)</Text>
          </Box>
        )}

        {activeTab === "contact" && (
          <Box flexDirection="column">
            <Text>github: github.com/...</Text>
            <Text>email: ...</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">use arrow keys to switch tabs, q to quit</Text>
      </Box>
    </Box>
  );
}
