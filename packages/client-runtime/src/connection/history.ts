import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as DateTime from "effect/DateTime";
import type { SupervisorConnectionState } from "./model.ts";

export interface ConnectionHistoryEntry {
  readonly event: string;
  readonly timestamp: string;
  readonly environmentId: string;
  readonly targetKind: string;
  readonly previousPhase: SupervisorConnectionState["phase"];
  readonly phase: SupervisorConnectionState["phase"];
  readonly stage: SupervisorConnectionState["stage"];
  readonly network: SupervisorConnectionState["network"];
  readonly attempt: number;
  readonly generation: number;
  readonly retryAt: number | null;
  readonly reason: string | null;
  readonly hop: string | null;
  readonly via: string | null;
  readonly failureCause: string | null;
  readonly httpStatus: number | null;
  readonly socketCloseCode: number | null;
  readonly traceId: string | null;
}

export class ConnectionHistory extends Context.Reference<{
  readonly record: (entry: ConnectionHistoryEntry) => Effect.Effect<void>;
}>("@t3tools/client-runtime/connection/ConnectionHistory", {
  defaultValue: () => ({ record: () => Effect.void }),
}) {}

export function connectionHistoryEntry(
  timestamp: number,
  environmentId: string,
  targetKind: string,
  previous: SupervisorConnectionState,
  next: SupervisorConnectionState,
  event = "state",
): ConnectionHistoryEntry {
  const failure = next.lastFailure;
  // Never retain raw error messages or route URLs: either can contain credentials.
  return {
    event,
    timestamp: DateTime.formatIso(DateTime.makeUnsafe(timestamp)),
    environmentId,
    targetKind,
    previousPhase: previous.phase,
    phase: next.phase,
    stage: next.stage,
    network: next.network,
    attempt: next.attempt,
    generation: next.generation,
    retryAt: next.retryAt,
    reason: failure?.reason ?? null,
    hop: failure?.hop ?? null,
    via: failure?.via ?? null,
    failureCause: failure?.failureCause ?? null,
    httpStatus: failure?.httpStatus ?? null,
    socketCloseCode: failure?.socketCloseCode ?? null,
    traceId: failure?.traceId ?? null,
  };
}
