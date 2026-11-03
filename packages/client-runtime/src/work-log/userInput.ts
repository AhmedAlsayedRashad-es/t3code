import type {
  OrchestrationV2UserInputQuestion,
  UserInputAttachmentAnswerPayload,
} from "@t3tools/contracts";
import { normalizeSelectedOptionValues } from "../state/pendingUserInput.ts";

function questionAnswerValues(value: unknown): ReadonlyArray<string> {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(questionAnswerValues);
  if (value !== null && typeof value === "object" && "answers" in value) {
    return questionAnswerValues(value.answers);
  }
  return [];
}

export function getQuestionAnswerHistory(
  answer: UserInputAttachmentAnswerPayload,
  questions: ReadonlyArray<OrchestrationV2UserInputQuestion> = [],
) {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const ids = new Set([
    ...questionsById.keys(),
    ...Object.keys(answer.questionTextById ?? {}),
    ...Object.keys(answer.answers),
    ...Object.keys(answer.attachmentsByQuestionId),
  ]);
  return Array.from(ids, (id) => {
    const question = questionsById.get(id);
    const options = question?.options ?? [];
    const responses = questionAnswerValues(answer.answers[id]).map((text) => ({
      text,
      optionValue: normalizeSelectedOptionValues({ id, options }, [text])[0],
    }));
    return {
      id,
      question: question?.question ?? answer.questionTextById?.[id] ?? "Question",
      options: options.map((option) => ({
        ...option,
        selected: responses.some(
          (response) => response.optionValue === (option.value ?? option.label.trim()),
        ),
      })),
      answerText: responses
        .filter((response) => response.optionValue === undefined)
        .map((response) => response.text)
        .join("\n"),
      attachments: answer.attachmentsByQuestionId[id] ?? [],
    };
  });
}
