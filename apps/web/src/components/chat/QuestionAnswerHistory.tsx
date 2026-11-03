import { use, useId, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type {
  EnvironmentId,
  OrchestrationV2UserInputQuestion,
  UserInputAttachmentAnswerPayload,
} from "@t3tools/contracts";
import type { TimestampFormat } from "@t3tools/contracts/settings";
import { getQuestionAnswerHistory } from "@t3tools/client-runtime/work-log/user-input";

import { useAssetUrls } from "../../assets/assetUrls";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { TimelineRowCtx } from "./timelineRowContext";
import { TimelineRowTimestamp } from "./TimelineRowParts";

export function QuestionAnswerHistory({
  answer,
  questions,
  createdAt,
}: {
  answer: UserInputAttachmentAnswerPayload;
  questions: ReadonlyArray<OrchestrationV2UserInputQuestion>;
  createdAt: string;
}) {
  const { activeThreadEnvironmentId, timestampFormat } = use(TimelineRowCtx);
  return (
    <div className="space-y-3 py-2">
      {getQuestionAnswerHistory(answer, questions).map((question) => (
        <AnsweredQuestionCard
          key={question.id}
          question={question}
          environmentId={activeThreadEnvironmentId}
          createdAt={createdAt}
          timestampFormat={timestampFormat}
        />
      ))}
    </div>
  );
}

function AnsweredQuestionCard({
  question,
  environmentId,
  createdAt,
  timestampFormat,
}: {
  question: ReturnType<typeof getQuestionAnswerHistory>[number];
  environmentId: EnvironmentId;
  createdAt: string;
  timestampFormat: TimestampFormat;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const questionHeadingId = useId();
  const optionsId = useId();
  const urls = useAssetUrls(
    environmentId,
    question.attachments.map((attachment) => ({
      _tag: "attachment",
      attachmentId: attachment.id,
    })),
  );
  const hasSelection = question.options.some((option) => option.selected);
  const hasDetails = question.options.some((option) => option.description || option.preview);
  return (
    <article
      aria-labelledby={questionHeadingId}
      className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground"
      data-v2-item-type="user_input_request"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-success-foreground">
          <CheckIcon aria-hidden className="size-3.5" />
          Question answered
        </span>
        <TimelineRowTimestamp
          createdAt={createdAt}
          timestampFormat={timestampFormat}
          alwaysVisible
        />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Agent asked</p>
        <h3
          id={questionHeadingId}
          dir="auto"
          className="whitespace-pre-wrap wrap-anywhere text-sm font-medium leading-relaxed"
        >
          {question.question}
        </h3>
      </div>
      {question.options.length > 0 ? (
        <ul id={optionsId} aria-label="Original options" className="space-y-1">
          {question.options.map((option) => (
            <li
              key={option.value ?? option.label}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border border-transparent p-2.5",
                option.selected && "border-border bg-accent/50",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border",
                  option.selected && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {option.selected ? <CheckIcon className="size-3" /> : null}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span dir="auto" className="whitespace-pre-wrap wrap-anywhere text-sm">
                    {option.label}
                  </span>
                  {option.selected ? (
                    <span className="text-xs text-muted-foreground">Your choice</span>
                  ) : null}
                </div>
                {showDetails && option.description ? (
                  <p
                    dir="auto"
                    className="whitespace-pre-wrap wrap-anywhere text-sm text-muted-foreground"
                  >
                    {option.description}
                  </p>
                ) : null}
                {showDetails && option.preview ? (
                  <pre dir="auto" className="whitespace-pre-wrap wrap-anywhere text-xs">
                    {option.preview}
                  </pre>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {question.answerText || question.attachments.length > 0 || !hasSelection ? (
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {hasSelection ? "Your added response" : "Your answer"}
          </p>
          {question.answerText ? (
            <p dir="auto" className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed">
              {question.answerText}
            </p>
          ) : question.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answer provided.</p>
          ) : null}
          {question.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {question.attachments.map((attachment, index) => (
                <a
                  key={attachment.id}
                  href={urls[index] ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="wrap-anywhere text-sm underline"
                >
                  {attachment.type === "image" && urls[index] ? (
                    <img
                      src={urls[index]}
                      alt={attachment.name}
                      className="h-20 max-w-32 rounded object-contain"
                    />
                  ) : (
                    attachment.name
                  )}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {hasDetails ? (
        <div>
          <Button
            variant="ghost-muted"
            size="xs"
            aria-expanded={showDetails}
            aria-controls={optionsId}
            onClick={() => setShowDetails((shown) => !shown)}
          >
            {showDetails ? "Hide option details" : "Show option details"}
            <ChevronDownIcon aria-hidden className={cn(showDetails && "rotate-180")} />
          </Button>
        </div>
      ) : null}
    </article>
  );
}
