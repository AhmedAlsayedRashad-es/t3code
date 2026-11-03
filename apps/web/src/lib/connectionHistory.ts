import { ConnectionHistory, type ConnectionHistoryEntry } from "@t3tools/client-runtime/connection";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

const STORAGE_KEY = "t3:connection-history:v1";
const MAX_ENTRIES = 1000;

export function appendConnectionHistory(
  storage: Pick<Storage, "getItem" | "setItem">,
  entry: ConnectionHistoryEntry,
): void {
  const lines = (storage.getItem(STORAGE_KEY) ?? "").split("\n").filter(Boolean);
  lines.push(JSON.stringify({ version: 1, appVersion: import.meta.env.APP_VERSION, ...entry }));
  storage.setItem(STORAGE_KEY, lines.slice(-MAX_ENTRIES).join("\n"));
}

export const layerConnectionHistory = Layer.succeed(ConnectionHistory, {
  record: Effect.fn("ConnectionHistory.record")(function* (entry: ConnectionHistoryEntry) {
    if (typeof localStorage === "undefined") return;
    yield* Effect.try(() => appendConnectionHistory(localStorage, entry)).pipe(
      Effect.catch((error) => Effect.logError("Unable to persist connection history", error)),
    );
  }),
});

export function downloadConnectionHistory(): void {
  const blob = new Blob([localStorage.getItem(STORAGE_KEY) ?? ""], {
    type: "application/x-ndjson",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `t3-connection-history-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
  anchor.click();
  URL.revokeObjectURL(url);
}
