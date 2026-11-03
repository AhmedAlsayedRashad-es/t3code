import { describe, expect, it } from "vite-plus/test";

import { getQuestionAnswerHistory } from "./userInput.ts";

describe("answered question history", () => {
  it.each([
    { value: " web ", selected: ["Web and desktop"], text: "" },
    { value: "", selected: ["Skip"], text: "" },
    { value: { answers: ["All clients"] }, selected: ["All clients"], text: "" },
    { value: "  All clients  ", selected: ["All clients"], text: "" },
    {
      value: [" web ", "All clients"],
      selected: ["Web and desktop", "All clients"],
      text: "",
    },
    {
      value: [" web ", "Include mobile later.\nKeep my formatting."],
      selected: ["Web and desktop"],
      text: "Include mobile later.\nKeep my formatting.",
    },
    { value: "web", selected: [], text: "web" },
    { value: "My own answer.\nAnother line.", selected: [], text: "My own answer.\nAnother line." },
  ])(
    "matches original option values without losing written text: $value",
    ({ value, selected, text }) => {
      const [question] = getQuestionAnswerHistory(
        { requestId: "request", answers: { scope: value }, attachmentsByQuestionId: {} },
        [
          {
            id: "scope",
            header: "Scope",
            question: "Where should this change apply?",
            options: [
              {
                label: "Web and desktop",
                value: " web ",
                description: "The browser and desktop app.",
              },
              { label: "All clients", description: "Include mobile." },
              { label: "Skip", value: "", description: "Leave the scope unchanged." },
            ],
          },
        ],
      );

      expect(question?.question).toBe("Where should this change apply?");
      expect(
        question?.options.filter((option) => option.selected).map((option) => option.label),
      ).toEqual(selected);
      expect(question?.options[0]?.description).toBe("The browser and desktop app.");
      expect(question?.answerText).toBe(text);
    },
  );

  it("keeps older answers readable when the original options are unavailable", () => {
    const history = getQuestionAnswerHistory({
      requestId: "request",
      questionTextById: { scope: "Which scope?", optional: "Any other notes?" },
      answers: { scope: { answers: ["Web", "Mobile"] }, legacy: "Keep this answer." },
      attachmentsByQuestionId: {},
    });

    expect(history.map(({ id, question, answerText }) => ({ id, question, answerText }))).toEqual([
      { id: "scope", question: "Which scope?", answerText: "Web\nMobile" },
      { id: "optional", question: "Any other notes?", answerText: "" },
      { id: "legacy", question: "Question", answerText: "Keep this answer." },
    ]);
  });
});
