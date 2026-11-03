import { describe, expect, it } from "vite-plus/test";
import { connectionHistoryEntry } from "./history.ts";
import { AVAILABLE_CONNECTION_STATE, ConnectionTransientError } from "./model.ts";

describe("connection history", () => {
  it("retains diagnostic fields without retaining credentials from error details", () => {
    const record = connectionHistoryEntry(
      0,
      "env",
      "PrimaryConnectionTarget",
      AVAILABLE_CONNECTION_STATE,
      {
        ...AVAILABLE_CONNECTION_STATE,
        phase: "backoff",
        attempt: 2,
        retryAt: 1000,
        lastFailure: new ConnectionTransientError({
          reason: "timeout",
          detail: "wss://user:secret@example.test/ws?token=private",
          hop: "server",
          via: "direct",
          httpStatus: 502,
          socketCloseCode: 1006,
          traceId: "trace-1",
        }),
      },
    );
    expect(record).toMatchObject({
      timestamp: "1970-01-01T00:00:00.000Z",
      previousPhase: "available",
      phase: "backoff",
      attempt: 2,
      reason: "timeout",
      hop: "server",
      via: "direct",
      httpStatus: 502,
      socketCloseCode: 1006,
      traceId: "trace-1",
    });
    expect(JSON.stringify(record)).not.toMatch(/secret|private|example/);
  });
});
