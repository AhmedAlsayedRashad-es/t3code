import type {
  ProviderInstanceId,
  ServerProvider,
  ServerProviderUsageWindow,
  UsageLimitSourceSnapshots,
} from "@t3tools/contracts";
import {
  collectProviderUsageLimits,
  formatDuration,
  type LimitPace,
  limitsNotice,
  paceOf,
  remainingPercent,
} from "@t3tools/shared/usageLimits";
import type { ReactNode } from "react";

import { usePrimarySettings } from "../../hooks/useSettings";
import { useNowMinute } from "../../hooks/useNowMinute";
import { type ContextWindowSnapshot, formatContextWindowTokens } from "../../lib/contextWindow";
import { cn } from "../../lib/utils";
import { formatUpcomingTimestamp } from "../../timestampFormat";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ThreadDetailsSection } from "./ThreadDetailsSection";
import { Button } from "../ui/button";

const PACE_LABEL: Record<LimitPace, string> = {
  ahead: "Ahead of pace",
  on: "On pace",
  under: "Under pace",
};

export interface ThreadDetailsUsageInput {
  readonly providerInstanceId: ProviderInstanceId | null;
  readonly providers: readonly ServerProvider[];
  readonly sources: UsageLimitSourceSnapshots;
  readonly contextWindow: ContextWindowSnapshot | null;
}

type UsageTone = "error" | "warning" | null;

/** The selected provider's limit windows. Each row reads as room left. */
export function ThreadDetailsUsage({
  providerInstanceId,
  providers,
  sources,
}: Omit<ThreadDetailsUsageInput, "contextWindow">) {
  const nowMinute = useNowMinute();
  const now = Date.parse(`${nowMinute}:00Z`);
  const report =
    providerInstanceId !== null
      ? collectProviderUsageLimits(providerInstanceId, providers, sources, now)
      : null;
  // Only this instance's data: the report keeps one instance per login, and any other entry may be
  // a different login or workspace, so fall back to the instance's own snapshot.
  const limits =
    report?.accounts.find((entry) => entry.instanceId === providerInstanceId)?.limits ??
    providers.find((provider) => provider.instanceId === providerInstanceId)?.usageLimits;
  if (!limits) return null;
  const notice = limitsNotice(limits);

  return (
    <ThreadDetailsSection
      headingId="thread-details-usage-heading"
      title="Usage limits"
      showHeading={false}
    >
      <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] gap-x-3 text-xs">
        {notice ? (
          <UsageRow
            label="Limits"
            fill={null}
            tone={null}
            value="Unavailable"
            tooltip={<span className="text-foreground">{notice}</span>}
          />
        ) : (
          limits.windows.map((window) => <LimitRow key={window.id} window={window} now={now} />)
        )}
      </div>
    </ThreadDetailsSection>
  );
}

/** The thread's context window. The bar fills as context is used; the tick marks auto-compaction. */
export function ThreadDetailsContext({
  usage,
  onCompact,
  compactDisabled,
  compactDisabledReason,
}: {
  readonly usage: ContextWindowSnapshot | null;
  readonly onCompact: () => void;
  readonly compactDisabled: boolean;
  readonly compactDisabledReason: string | null;
}) {
  if (usage === null) {
    return (
      <ThreadDetailsSection headingId="thread-details-context-heading" title="Context window">
        <div className="space-y-2 px-2.5">
          <p className="text-xs text-muted-foreground">Context size has not been reported yet.</p>
          <Button size="xs" variant="outline" onClick={onCompact} disabled={compactDisabled}>
            Compact session
          </Button>
          {compactDisabled && compactDisabledReason ? (
            <p className="text-2xs text-muted-foreground">{compactDisabledReason}</p>
          ) : null}
        </div>
      </ThreadDetailsSection>
    );
  }
  const maxTokens = usage.maxTokens != null && usage.maxTokens > 0 ? usage.maxTokens : null;
  const used =
    maxTokens !== null && usage.usedPercentage !== null
      ? Math.round(Math.max(0, Math.min(100, usage.usedPercentage)))
      : null;
  const threshold = usage.autoCompactThreshold ?? null;
  const tick =
    maxTokens !== null && threshold !== null && threshold > 0 && threshold < maxTokens
      ? (threshold / maxTokens) * 100
      : null;
  const usedTokens = formatContextWindowTokens(usage.usedTokens);
  return (
    <ThreadDetailsSection headingId="thread-details-context-heading" title="Context window">
      <div className="space-y-2 px-2.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>{used === null ? "Tokens used" : `${used}% used`}</span>
          <span className="tabular-nums">
            {usedTokens}
            {maxTokens ? ` / ${formatContextWindowTokens(maxTokens)}` : ""}
          </span>
        </div>
        {used !== null ? (
          <div
            className="relative h-1.5 overflow-hidden rounded-full bg-muted-foreground/20"
            role="progressbar"
            aria-label="Context window usage"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn("h-full rounded-full", used >= 90 ? "bg-error" : "bg-info")}
              style={{ width: `${used}%` }}
            />
            {tick !== null ? (
              <span
                className="absolute inset-y-0 w-px bg-foreground"
                style={{ left: `${tick}%` }}
              />
            ) : null}
          </div>
        ) : null}
        {(
          [
            ["Input", usage.inputTokens, "bg-info", false],
            ["Cached input (included)", usage.cachedInputTokens, "bg-success", true],
            ["Output", usage.outputTokens, "bg-warning", false],
            ["Reasoning (included)", usage.reasoningOutputTokens, "bg-primary", true],
            ["Free space", usage.remainingTokens, "bg-muted-foreground/40", false],
          ] as const
        ).map(([label, tokens, color, subset]) => (
          <div
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_auto_3rem] items-center gap-2 text-muted-foreground"
          >
            <span className={cn("flex items-center gap-2", subset && "pl-3")}>
              <span aria-hidden className={cn("size-2 shrink-0 rounded-xs", color)} />
              {label}
            </span>
            {tokens != null ? (
              <Tooltip>
                <TooltipTrigger render={<span className="tabular-nums" />}>
                  {formatContextWindowTokens(tokens)}
                </TooltipTrigger>
                <TooltipPopup side="left">{tokens.toLocaleString("en-US")} tokens</TooltipPopup>
              </Tooltip>
            ) : (
              <span>Not reported</span>
            )}
            <span className="text-right tabular-nums">
              {tokens != null && maxTokens !== null
                ? `${((tokens / maxTokens) * 100).toFixed(1)}%`
                : "-"}
            </span>
          </div>
        ))}
        <p className="text-2xs text-muted-foreground">
          Latest provider report. Input includes messages, tools, and instructions. Separate sizes
          for system prompts, skills, and MCP tools are not reported.
        </p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-2xs text-muted-foreground">
            {threshold !== null
              ? `${formatContextWindowTokens(Math.max(0, threshold - usage.usedTokens))} until auto-compact`
              : usage.compactsAutomatically
                ? "Auto-compacts when needed"
                : ""}
          </span>
          <Button size="xs" variant="outline" onClick={onCompact} disabled={compactDisabled}>
            Compact session
          </Button>
        </div>
        {compactDisabled && compactDisabledReason ? (
          <p className="text-2xs text-muted-foreground">{compactDisabledReason}</p>
        ) : null}
      </div>
    </ThreadDetailsSection>
  );
}

function LimitRow({
  window,
  now,
}: {
  readonly window: ServerProviderUsageWindow;
  readonly now: number;
}) {
  const timestampFormat = usePrimarySettings((settings) => settings.timestampFormat);
  const left = remainingPercent(window);
  const pace = paceOf(window, now);
  const resetsAt = window.resetsAt ? Date.parse(window.resetsAt) : Number.NaN;
  return (
    <UsageRow
      label={window.label}
      fill={left}
      tone={left <= 10 ? "error" : left <= 20 ? "warning" : null}
      value={`${left}%`}
      ariaValue={`${left}% left`}
      tooltip={
        <>
          <span className="text-foreground">
            {window.label}: {left}% left
          </span>
          {window.resetsAt && resetsAt > now ? (
            <span className="text-muted-foreground">
              Resets in {formatDuration(resetsAt - now)} ·{" "}
              {formatUpcomingTimestamp(window.resetsAt, timestampFormat, now)}
            </span>
          ) : null}
          {pace ? <span className="text-muted-foreground">{PACE_LABEL[pace]}</span> : null}
        </>
      }
    />
  );
}

/** One label, hairline, and value row; the whole row opens the details tooltip. */
function UsageRow({
  label,
  fill,
  tone,
  tick = null,
  value,
  ariaValue = value,
  tooltip,
  muted = false,
}: {
  readonly label: string;
  /** Bar fill from 0 to 100. Null hides the bar. */
  readonly fill: number | null;
  readonly tone: UsageTone;
  /** A marker on the bar, from 0 to 100. */
  readonly tick?: number | null;
  readonly value: string;
  readonly ariaValue?: string;
  readonly tooltip: ReactNode;
  readonly muted?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            tabIndex={0}
            aria-label={`${label}: ${ariaValue}`}
            className="col-span-3 grid h-6 cursor-default grid-cols-subgrid items-center rounded-lg px-2.5 outline-none hover:bg-black/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-popup-open:bg-black/[0.035] dark:hover:bg-white/[0.08] dark:data-popup-open:bg-white/[0.08]"
          />
        }
      >
        <span className="max-w-28 truncate text-muted-foreground">{label}</span>
        {fill !== null ? (
          <span className="relative h-[3px] rounded-full bg-muted-foreground/30 dark:bg-muted-foreground/20">
            {fill > 0 ? (
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  tone === "error"
                    ? "bg-error"
                    : tone === "warning"
                      ? "bg-warning"
                      : muted
                        ? "bg-muted-foreground"
                        : "bg-foreground/80",
                )}
                style={{ width: `max(${fill}%, 6px)` }}
              />
            ) : null}
            {tick !== null ? (
              <span
                aria-hidden
                className="absolute -top-[3px] h-[9px] w-px -translate-x-1/2 bg-foreground/60"
                style={{ left: `${tick}%` }}
              />
            ) : null}
          </span>
        ) : null}
        <span
          className={cn(
            // Text-only rows span the bar column so they never widen the shared value column.
            "text-end font-medium tabular-nums",
            fill === null && "col-span-2",
            tone === "error"
              ? "text-error-foreground"
              : tone === "warning"
                ? "text-warning-foreground"
                : fill === null
                  ? "text-muted-foreground"
                  : "text-foreground/80",
          )}
        >
          {value}
        </span>
      </TooltipTrigger>
      {/* Rows sit 8px inside the card; clear its edge instead of overlapping it. */}
      <TooltipPopup side="left" sideOffset={16}>
        <div className="flex flex-col gap-0.5">{tooltip}</div>
      </TooltipPopup>
    </Tooltip>
  );
}
