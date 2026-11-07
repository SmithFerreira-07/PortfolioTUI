import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import {
  EMPTY_DRAFT,
  loadPortfolio,
  normalizePortfolio,
  savePortfolio,
  type PortfolioData,
} from "../portfolio.ts";
import { ListStep, RecordStep } from "./FormControls.tsx";
import {
  CONTACT_FIELDS,
  PROFILE_FIELDS,
  PROJECT_FIELDS,
  ReviewStep,
  SKILL_FIELD,
  SavedScreen,
  ThemeStep,
} from "./Steps.tsx";

const STEP_ORDER = [
  "profile",
  "skills",
  "projects",
  "contact",
  "theme",
  "review",
] as const;

type StepId = (typeof STEP_ORDER)[number];

type WizardState =
  | { kind: "editing"; step: StepId; saveError: string | null }
  | { kind: "saved"; filePath: string };

export default function BuilderWizard({
  onLaunchPortfolio,
}: {
  onLaunchPortfolio: () => void;
}) {
  const { exit } = useApp();

  const [draft, setDraft] = useState<PortfolioData>(() => {
    const loaded = loadPortfolio();
    return loaded.status === "custom" ? loaded.data : EMPTY_DRAFT;
  });

  const [wizardState, setWizardState] = useState<WizardState>({
    kind: "editing",
    step: "profile",
    saveError: null,
  });

  const { accentColor } = draft.theme;

  if (wizardState.kind === "saved") {
    return (
      <SavedScreen
        filePath={wizardState.filePath}
        accentColor={accentColor}
        onLaunchPortfolio={onLaunchPortfolio}
        onExit={exit}
      />
    );
  }

  const currentStep = wizardState.step;
  const stepIndex = STEP_ORDER.indexOf(currentStep);

  const goToStep = (step: StepId) =>
    setWizardState({ kind: "editing", step, saveError: null });

  const goBackOrExit = () =>
    stepIndex > 0 ? goToStep(STEP_ORDER[stepIndex - 1]!) : exit();

  const handleSave = () => {
    const result = savePortfolio(draft);
    if (result.ok) {
      setDraft(result.data);
      setWizardState({ kind: "saved", filePath: result.filePath });
    } else {
      setWizardState({
        kind: "editing",
        step: "review",
        saveError: result.error,
      });
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={accentColor}>
          ✦ portfolio-cli builder
        </Text>
        <Text color="gray">
          Step {stepIndex + 1} of {STEP_ORDER.length}
        </Text>
      </Box>

      <Box gap={2} marginBottom={1}>
        {STEP_ORDER.map((step, idx) => {
          const isCurrent = step === currentStep;
          const isDone = idx < stepIndex;
          return (
            <Text
              key={step}
              color={isCurrent ? accentColor : isDone ? "green" : "gray"}
              bold={isCurrent}
              underline={isCurrent}
            >
              {isDone ? "✓ " : `${idx + 1}. `}
              {step}
            </Text>
          );
        })}
      </Box>

      <Box
        borderStyle="single"
        borderColor={accentColor}
        padding={1}
        flexDirection="column"
        minHeight={12}
      >
        {currentStep === "profile" && (
          <RecordStep
            title="Tell us about yourself"
            fields={PROFILE_FIELDS}
            initialValue={draft.profile}
            accentColor={accentColor}
            onComplete={(profile) => {
              setDraft((prev) => ({ ...prev, profile }));
              goToStep("skills");
            }}
            onBack={goBackOrExit}
          />
        )}

        {currentStep === "skills" && (
          <ListStep
            title="Skills & Tech Stack"
            hint="Type a skill (or comma-separated list) and press Enter. Press Enter when empty to continue. (Backspace when empty removes last skill)"
            fields={SKILL_FIELD}
            emptyDraft={{ skill: "" }}
            initialItems={draft.skills}
            accentColor={accentColor}
            parseDraft={({ skill }) =>
              skill
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            }
            renderItems={(skills) => (
              <Box flexWrap="wrap" gap={1}>
                {skills.map((skill, idx) => (
                  <Text key={`${skill}-${idx}`} color={accentColor} bold>
                    [{skill}]
                  </Text>
                ))}
              </Box>
            )}
            onComplete={(skills) => {
              setDraft((prev) => ({ ...prev, skills }));
              goToStep("projects");
            }}
            onBack={goBackOrExit}
          />
        )}

        {currentStep === "projects" && (
          <ListStep
            title="Projects"
            hint="Fill in a project to add it, or press Enter with an empty Title to continue. (Backspace on empty Title removes last project)"
            fields={PROJECT_FIELDS}
            emptyDraft={{ title: "", description: "", link: "" }}
            initialItems={draft.projects}
            accentColor={accentColor}
            parseDraft={({ title, description, link }) =>
              title.trim()
                ? [
                    {
                      title: title.trim(),
                      description:
                        description.trim() || "No description provided",
                      link: link.trim(),
                    },
                  ]
                : []
            }
            renderItems={(projects) => (
              <Box flexDirection="column">
                {projects.map((p, idx) => (
                  <Text key={`${p.title}-${idx}`} color="green">
                    ✓ {p.title} <Text color="gray">— {p.description}</Text>
                  </Text>
                ))}
              </Box>
            )}
            onComplete={(projects) => {
              setDraft((prev) => ({ ...prev, projects }));
              goToStep("contact");
            }}
            onBack={goBackOrExit}
          />
        )}

        {currentStep === "contact" && (
          <RecordStep
            title="Contact & Links"
            fields={CONTACT_FIELDS}
            initialValue={draft.contact}
            accentColor={accentColor}
            onComplete={(contact) => {
              setDraft((prev) => ({ ...prev, contact }));
              goToStep("theme");
            }}
            onBack={goBackOrExit}
          />
        )}

        {currentStep === "theme" && (
          <ThemeStep
            theme={draft.theme}
            previewProfile={draft.profile}
            onChangeTheme={(theme) =>
              setDraft((prev) => ({
                ...prev,
                theme,
              }))
            }
            onComplete={() => goToStep("review")}
            onBack={goBackOrExit}
          />
        )}

        {currentStep === "review" && (
          <ReviewStep
            data={normalizePortfolio(draft)}
            saveError={wizardState.saveError}
            onConfirmSave={handleSave}
            onBack={goBackOrExit}
          />
        )}
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text color="gray">
          ↑/↓/Tab: Navigate fields • Enter: Next / Confirm • Esc:{" "}
          {stepIndex > 0 ? "Previous step" : "Quit"}
        </Text>
      </Box>
    </Box>
  );
}
