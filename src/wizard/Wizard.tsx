//wizard orchestrator: binds each step's { label, hints, view } in one table so step order, key hints, and views never drift
import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { KeyHints, useFlash, type Hint } from "../KeyHints.tsx";
import { EMPTY_PORTFOLIO, accentOf, cleanText, normalize, type Link, type Portfolio, type Project } from "../schema.ts";
import { describeFile, saveEntry, type Entry } from "../store.ts";
import { Fields, type Field } from "./Fields.tsx";
import { ListStep } from "./ListStep.tsx";
import { ReviewStep, SkillsStep, StyleStep } from "./steps.tsx";

const PROFILE_FIELDS: readonly Field<"name" | "role" | "bio">[] = [
  { key: "name", label: "Name", placeholder: "Ada Lovelace" },
  { key: "role", label: "Headline", placeholder: "Full-stack engineer building developer tools" },
  { key: "bio", label: "Short bio", placeholder: "I build fast terminal tools and care about good defaults." },
];

const PROJECT_FIELDS: readonly Field<keyof Project>[] = [
  { key: "title", label: "Title", placeholder: "portfolio-tui" },
  { key: "description", label: "One-line description", placeholder: "A terminal portfolio you can share with one command" },
  { key: "link", label: "Link", placeholder: "github.com/you/portfolio-tui" },
];

const LINK_FIELDS: readonly Field<keyof Link>[] = [
  { key: "label", label: "Label", placeholder: "GitHub" },
  { key: "url", label: "URL or email", placeholder: "github.com/you" },
];

const EMPTY_PROJECT: Project = { title: "", description: "", link: "" };
const EMPTY_LINK: Link = { label: "", url: "" };

const LIST_HINTS: readonly Hint[] = [["↑↓", "select"], ["enter", "edit"], ["a", "add"], ["d", "delete"], ["esc", "back"]];
const EDIT_ITEM_HINTS: readonly Hint[] = [["↑↓", "field"], ["enter", "save"], ["esc", "cancel"]];

//manage wizard draft state, step navigation, sub-mode key hints (editingitem), and disk persistence
export function Wizard({ entry, onView, onClose }: {
  entry?: Entry;
  onView: (entry: Entry) => void;
  onClose: () => void;
}) {
  const initialData = entry?.data ?? EMPTY_PORTFOLIO;
  const [draft, setDraft] = useState<Portfolio>(initialData);
  const [step, setStep] = useState(0);
  const [editingItem, setEditingItem] = useState(false);
  const [saved, setSaved] = useState<Entry | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveWarning, setLeaveWarning] = useFlash();
  const accent = accentOf(draft);

  if (saved) return <Saved entry={saved} isNew={!entry} onView={() => onView(saved)} onClose={onClose} />;

  //apply a partial update to the draft and clear any pending discard warning
  const update = (patch: Partial<Portfolio>) => {
    if (leaveWarning) setLeaveWarning("");
    setDraft((d) => ({ ...d, ...patch }));
  };

  //transition to a target step index while resetting per-step sub-mode and error state
  const goTo = (target: number) => {
    setEditingItem(false);
    setSaveError(null);
    if (leaveWarning) setLeaveWarning("");
    setStep(Math.max(0, Math.min(steps.length - 1, target)));
  };

  //advance to the next wizard step
  const next = () => goTo(step + 1);

  //step backward, or prompt before discarding unsaved edits on the first step
  const back = () => {
    if (step > 0) return goTo(step - 1);
    if (leaveWarning || !hasUnsavedChanges(draft, initialData)) return onClose();
    setLeaveWarning("Unsaved changes. Press esc again to discard them.");
  };

  //asynchronously persist the normalized draft to disk and transition to the saved screen
  const save = async () => {
    try {
      setSaved(await saveEntry(draft, entry?.file));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  const steps: readonly { label: string; hints: readonly Hint[]; view: React.ReactNode }[] = [
    {
      label: "Profile",
      hints: [["↑↓", "field"], ["enter", "next"], ["esc", "back"]],
      view: (
        <Fields fields={PROFILE_FIELDS} values={draft} accent={accent} required={["name"]}
          onChange={(key, value) => update({ [key]: value })} onSubmit={next} onEscape={back} />
      ),
    },
    {
      label: "Skills",
      hints: [["enter", "next"], ["esc", "back"]],
      view: (
        <SkillsStep skills={draft.skills} accent={accent}
          onChange={(skills) => update({ skills })} onNext={next} onBack={back} />
      ),
    },
    {
      label: "Projects",
      hints: editingItem ? EDIT_ITEM_HINTS : LIST_HINTS,
      view: (
        <ListStep key="projects" noun="project" fields={PROJECT_FIELDS} emptyItem={EMPTY_PROJECT} required="title"
          items={draft.projects} accent={accent} describe={(p) => cleanText(p.title)}
          onChange={(projects) => update({ projects: normalize({ ...draft, projects }).projects })}
          onEditingChange={setEditingItem} onNext={next} onBack={back} />
      ),
    },
    {
      label: "Links",
      hints: editingItem ? EDIT_ITEM_HINTS : LIST_HINTS,
      view: (
        <ListStep key="links" noun="link" fields={LINK_FIELDS} emptyItem={EMPTY_LINK} required="url"
          items={draft.links} accent={accent}
          describe={(l) => (cleanText(l.label) ? `${cleanText(l.label)}  ${cleanText(l.url)}` : cleanText(l.url))}
          onChange={(links) => update({ links: normalize({ ...draft, links }).links })}
          onEditingChange={setEditingItem} onNext={next} onBack={back} />
      ),
    },
    {
      label: "Style",
      hints: [["↑↓", "option"], ["←→", "change"], ["enter", "next"], ["esc", "back"]],
      view: (
        <StyleStep data={draft} accent={accent}
          onChange={(theme) => update({ theme })} onNext={next} onBack={back} />
      ),
    },
    {
      label: "Review",
      hints: [["tab", "section"], ["↑↓", "select"], ["enter", "save"], ["esc", "back"]],
      view: <ReviewStep data={normalize(draft)} error={saveError} onSave={save} onBack={back} />,
    },
  ];

  const current = steps[step]!;
  return (
    <Box flexDirection="column" paddingX={1} rowGap={1}>
      <Box flexDirection="column">
        <Text bold>{entry ? `Editing ${entry.data.name}` : "New portfolio"}</Text>
        <Steps labels={steps.map((s) => s.label)} current={step} accent={accent} />
      </Box>
      {current.view}
      <KeyHints hints={current.hints} status={leaveWarning} accent={accent} />
    </Box>
  );
}

//render the horizontal step breadcrumb header with checkmarks on completed steps
function Steps({ labels, current, accent }: { labels: readonly string[]; current: number; accent: string }) {
  return (
    <Box columnGap={1} flexWrap="wrap">
      {labels.map((label, i) => (
        <Text key={label} color={i === current ? accent : undefined} bold={i === current} dimColor={i > current}>
          {i < current ? "✓ " : ""}{label}{i < labels.length - 1 ? <Text dimColor>  ›</Text> : null}
        </Text>
      ))}
    </Box>
  );
}

//render the post-save confirmation screen with the exact cli command to reopen the saved file
function Saved({ entry, isNew, onView, onClose }: { entry: Entry; isNew: boolean; onView: () => void; onClose: () => void }) {
  const { exit } = useApp();
  const accent = accentOf(entry.data);
  const { path, arg } = describeFile(entry.file);
  useInput((input, key) => {
    if (key.return) return onView();
    if (key.escape) return onClose();
    if (input === "q") return exit();
  });
  return (
    <Box flexDirection="column" rowGap={1} paddingX={1}>
      <Text color={accent} bold>Saved {path}</Text>
      <Text dimColor>Open it any time with: bun start {arg}</Text>
      {isNew ? <Text dimColor>To add it to the shared gallery, open a pull request with that file.</Text> : null}
      <KeyHints accent={accent} hints={[["enter", "view it"], ["esc", "gallery"], ["q", "quit"]]} />
    </Box>
  );
}

//compare normalized draft and initial portfolio on demand when the user attempts to exit on step 0
function hasUnsavedChanges(draft: Portfolio, initial: Portfolio): boolean {
  return JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(initial));
}
