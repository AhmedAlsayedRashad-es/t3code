import { useRef, useState } from "react";
import { View } from "react-native";
import type { ServerSettingsPatch } from "@t3tools/contracts";
import { resolvePastedPath } from "@t3tools/shared/path";
import { AppText as Text, AppTextInput } from "../../../components/ui/AppText";
import { ListChoiceRow } from "../../../components/ui/ListChoiceRow";
import { SettingsSection } from "./SettingsSection";

export function WorktreeLocationSettings(props: {
  readonly projectSelected: boolean;
  readonly inherited: boolean;
  readonly inProject: boolean | null;
  readonly directory: string | null;
  readonly disabled: boolean;
  readonly managed?: string | undefined;
  readonly onChange: (patch: ServerSettingsPatch) => void;
  readonly onInherit: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const draft = useRef<string | null>(null);
  const mode = custom
    ? "custom"
    : props.inherited
      ? "inherit"
      : props.inProject === null
        ? null
        : props.inProject
          ? "project"
          : props.directory === null
            ? null
            : !props.projectSelected && props.directory === ""
              ? "default"
              : "custom";
  const reset = () => {
    setCustom(false);
    if (props.projectSelected) props.onInherit();
    else props.onChange({ worktreesInProject: false, worktreesDirectory: "" });
  };
  return (
    <SettingsSection title="Worktree location" footer={props.managed}>
      <ListChoiceRow
        label={props.projectSelected ? "Use environment setting" : "T3 home folder"}
        selected={mode === "inherit" || mode === "default"}
        disabled={props.disabled}
        onPress={reset}
      />
      <ListChoiceRow
        label={props.projectSelected ? "Inside this project" : "Inside each project"}
        description="Keep new worktrees in the primary repository's worktrees folder."
        selected={mode === "project"}
        disabled={props.disabled}
        separated
        onPress={() => {
          setCustom(false);
          props.onChange({ worktreesInProject: true });
        }}
      />
      <ListChoiceRow
        label="Custom folder"
        selected={mode === "custom"}
        disabled={props.disabled}
        separated
        onPress={() => {
          setCustom(true);
          if (props.directory !== null && props.directory !== "") {
            props.onChange({ worktreesInProject: false, worktreesDirectory: props.directory });
          }
        }}
      />
      {mode === "custom" || mode === null ? (
        <View className="gap-2 px-4 py-3">
          <Text className="text-sm text-foreground-muted">
            Folder on the environment's machine. Existing worktrees stay where they are.
          </Text>
          <AppTextInput
            key={props.directory}
            accessibilityLabel="Worktree location"
            defaultValue={props.directory ?? ""}
            placeholder={props.directory === null ? "Mixed" : "Absolute folder path"}
            editable={!props.disabled}
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-10 rounded-xl px-3 py-2 text-base text-foreground"
            onChangeText={(value) => {
              draft.current = resolvePastedPath(draft.current ?? props.directory ?? "", value);
            }}
            onEndEditing={() => {
              const value = draft.current?.trim();
              draft.current = null;
              if (value === undefined) return;
              if (value === "") reset();
              else props.onChange({ worktreesInProject: false, worktreesDirectory: value });
              setCustom(false);
            }}
          />
        </View>
      ) : null}
    </SettingsSection>
  );
}
