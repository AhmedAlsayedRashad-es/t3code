import { describe, expect, it } from "vite-plus/test";
import { appendConnectionHistory } from "./connectionHistory";
import {
  connectionHistoryEntry,
  AVAILABLE_CONNECTION_STATE,
} from "@t3tools/client-runtime/connection";

describe("persistent connection history", () => {
  it("keeps the latest 1000 events across recorder instances", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    for (let index = 0; index < 1002; index++) {
      appendConnectionHistory(
        { ...storage },
        connectionHistoryEntry(
          index,
          "env",
          "PrimaryConnectionTarget",
          AVAILABLE_CONNECTION_STATE,
          {
            ...AVAILABLE_CONNECTION_STATE,
            generation: index,
          },
        ),
      );
    }
    const lines = [...data.values()][0]!.split("\n").map((line) => JSON.parse(line));
    expect(lines).toHaveLength(1000);
    expect(lines[0].generation).toBe(2);
    expect(lines.at(-1).generation).toBe(1001);
  });
});
