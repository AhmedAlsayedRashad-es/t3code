import type {
  EnvironmentId,
  OrchestrationV2UserInputQuestion,
  UserInputAttachmentAnswerPayload,
  UserInputAttachments,
} from "@t3tools/contracts";
import { Image } from "expo-image";
import { Linking, Pressable, View } from "react-native";
import { getQuestionAnswerHistory } from "@t3tools/client-runtime/work-log/user-input";
import { useState } from "react";
import { SymbolView } from "../../components/ui/AppSymbol";
import { AppText as Text } from "../../components/ui/AppText";
import { assetImageSource } from "../../lib/assetImageSource";
import { useAssetUrl } from "../../state/assets";
import { cn } from "../../lib/cn";

function AnswerFile(props: {
  environmentId: EnvironmentId;
  attachment: UserInputAttachments[string][number];
}) {
  const resource = { _tag: "attachment", attachmentId: props.attachment.id } as const;
  const url = useAssetUrl(props.environmentId, resource);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={props.attachment.name}
      disabled={!url}
      onPress={() => {
        if (url) void Linking.openURL(url);
      }}
      className="gap-1"
    >
      {props.attachment.type === "image" && url ? (
        <Image
          source={assetImageSource(props.environmentId, resource, url)}
          cachePolicy="memory-disk"
          style={{ width: 160, height: 96 }}
          contentFit="contain"
        />
      ) : null}
      <Text className="text-sm text-foreground underline">{props.attachment.name}</Text>
    </Pressable>
  );
}

export function QuestionAnswerHistory(props: {
  environmentId: EnvironmentId;
  answer: UserInputAttachmentAnswerPayload;
  questions: ReadonlyArray<OrchestrationV2UserInputQuestion>;
  createdAt: string;
}) {
  return (
    <View className="gap-3 py-2">
      {getQuestionAnswerHistory(props.answer, props.questions).map((question) => (
        <AnsweredQuestionCard
          key={question.id}
          question={question}
          environmentId={props.environmentId}
          createdAt={props.createdAt}
        />
      ))}
    </View>
  );
}

function AnsweredQuestionCard(props: {
  question: ReturnType<typeof getQuestionAnswerHistory>[number];
  environmentId: EnvironmentId;
  createdAt: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { question } = props;
  const hasSelection = question.options.some((option) => option.selected);
  const hasDetails = question.options.some((option) => option.description || option.preview);
  return (
    <View className="gap-4 rounded-xl border border-border bg-card p-4">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <SymbolView
            name="checkmark"
            size={14}
            tintColorClassName="accent-adaptive-emerald-600-400"
          />
          <Text className="font-t3-medium text-xs text-adaptive-emerald-600-400">
            Question answered
          </Text>
        </View>
        <Text className="text-xs text-foreground-subtle">
          {new Date(props.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <View className="gap-1">
        <Text className="font-t3-medium text-xs text-foreground-muted">Agent asked</Text>
        <Text
          selectable
          accessibilityRole="header"
          className="font-t3-medium text-sm text-foreground"
        >
          {question.question}
        </Text>
      </View>
      {question.options.length > 0 ? (
        <View className="gap-1" accessibilityLabel="Original options">
          {question.options.map((option) => (
            <View
              key={option.value ?? option.label}
              className={cn(
                "flex-row items-start gap-2.5 rounded-lg border border-transparent p-2.5",
                option.selected && "border-border bg-subtle",
              )}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border",
                  option.selected && "border-primary bg-primary",
                )}
              >
                {option.selected ? (
                  <SymbolView
                    name="checkmark"
                    size={11}
                    tintColorClassName="accent-primary-foreground"
                  />
                ) : null}
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Text selectable className="shrink text-sm text-foreground">
                    {option.label}
                  </Text>
                  {option.selected ? (
                    <Text className="text-xs text-foreground-muted">Your choice</Text>
                  ) : null}
                </View>
                {showDetails && option.description ? (
                  <Text selectable className="text-sm text-foreground-muted">
                    {option.description}
                  </Text>
                ) : null}
                {showDetails && option.preview ? (
                  <Text selectable className="font-mono text-xs text-foreground">
                    {option.preview}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {question.answerText || question.attachments.length > 0 || !hasSelection ? (
        <View className="gap-2 rounded-lg bg-subtle p-3">
          <Text className="font-t3-medium text-xs text-foreground-muted">
            {hasSelection ? "Your added response" : "Your answer"}
          </Text>
          {question.answerText ? (
            <Text selectable className="text-sm text-foreground">
              {question.answerText}
            </Text>
          ) : question.attachments.length === 0 ? (
            <Text className="text-sm text-foreground-muted">No answer provided.</Text>
          ) : null}
          {question.attachments.map((attachment) => (
            <AnswerFile
              key={attachment.id}
              environmentId={props.environmentId}
              attachment={attachment}
            />
          ))}
        </View>
      ) : null}
      {hasDetails ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
          onPress={() => setShowDetails((shown) => !shown)}
          className="min-h-11 flex-row items-center gap-1.5 self-start active:opacity-70"
        >
          <Text className="text-xs text-foreground-muted">
            {showDetails ? "Hide option details" : "Show option details"}
          </Text>
          <SymbolView
            name={showDetails ? "chevron.up" : "chevron.down"}
            size={12}
            tintColorClassName="accent-foreground-muted"
          />
        </Pressable>
      ) : null}
    </View>
  );
}
