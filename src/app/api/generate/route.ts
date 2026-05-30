import OpenAI from "openai";
import { NextResponse } from "next/server";
import type {
  GenerateQuizErrorResponse,
  GenerateQuizRequest,
  GenerateQuizResponse,
} from "@/types/generate";
import type { QuizAnswer, QuizQuestion, Topic } from "@/types/quiz";

export const runtime = "nodejs";

const answerLabels = ["A", "B", "C", "D"] as const;
const topicMinLength = 2;
const topicMaxLength = 80;

type ModelQuizAnswer = {
  label: QuizAnswer["label"];
  text: string;
  wrongExplanation: string;
};

type ModelQuizResponse = {
  question: string;
  answers: ModelQuizAnswer[];
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["question", "answers"],
  properties: {
    question: {
      type: "string",
      minLength: 12,
      maxLength: 180,
    },
    answers: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "text", "wrongExplanation"],
        properties: {
          label: {
            type: "string",
            enum: answerLabels,
          },
          text: {
            type: "string",
            minLength: 3,
            maxLength: 120,
          },
          wrongExplanation: {
            type: "string",
            minLength: 8,
            maxLength: 160,
          },
        },
      },
    },
  },
} as const;

export async function POST(request: Request) {
  const body = await parseJson(request);

  if (!body.ok) {
    return errorResponse("invalid_json", body.error, 400);
  }

  const topicResult = validateTopic(body.value);

  if (!topicResult.ok) {
    return errorResponse(
      "invalid_request",
      "Topic is required before a quiz can be generated.",
      400,
      topicResult.errors,
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return errorResponse(
      "missing_api_key",
      "OPENAI_API_KEY is not configured.",
      503,
    );
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You generate quiz content for a game called Wrong Answers Only. Return JSON that exactly matches the schema. Every answer must be factually wrong. Do not include a correct answer, a partly correct answer, or an all-of-the-above answer.",
        },
        {
          role: "user",
          content: `Create one trivia-style question about "${topicResult.topic}". Include exactly four multiple-choice answers. Every answer must be wrong, and each answer needs a short hidden explanation of why it is wrong.`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "wrong_answers_only_quiz",
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = parseModelOutput(response.output_text);

    if (!parsed.ok) {
      return errorResponse(
        "invalid_generation",
        "The generated quiz did not match the expected format.",
        502,
        parsed.errors,
      );
    }

    return NextResponse.json<GenerateQuizResponse>({
      quiz: toQuiz(topicResult.topic, parsed.value),
    });
  } catch (error) {
    return errorResponse(
      "generation_failed",
      "Unable to generate a quiz right now.",
      502,
      [error instanceof Error ? error.message : "Unknown generation error."],
    );
  }
}

export function GET() {
  return errorResponse(
    "invalid_request",
    "Use POST with a JSON body containing a topic.",
    405,
  );
}

async function parseJson(request: Request) {
  try {
    return {
      ok: true as const,
      value: (await request.json()) as unknown,
    };
  } catch {
    return {
      ok: false as const,
      error: "Request body must be valid JSON.",
    };
  }
}

function validateTopic(body: unknown) {
  const errors: string[] = [];

  if (!isRecord(body)) {
    return {
      ok: false as const,
      errors: ["Request body must be a JSON object."],
    };
  }

  const requestBody = body as Partial<GenerateQuizRequest>;

  if (typeof requestBody.topic !== "string") {
    errors.push("topic must be a string.");
  }

  const topic =
    typeof requestBody.topic === "string" ? requestBody.topic.trim() : "";

  if (topic.length < topicMinLength) {
    errors.push(`topic must be at least ${topicMinLength} characters.`);
  }

  if (topic.length > topicMaxLength) {
    errors.push(`topic must be ${topicMaxLength} characters or fewer.`);
  }

  if (topic && !/^[\p{L}\p{N}\s&'.,:;!?()+#/-]+$/u.test(topic)) {
    errors.push("topic contains unsupported characters.");
  }

  return errors.length > 0
    ? { ok: false as const, errors }
    : { ok: true as const, topic };
}

function parseModelOutput(outputText: string) {
  try {
    const value = JSON.parse(outputText) as unknown;
    return validateModelQuiz(value);
  } catch {
    return {
      ok: false as const,
      errors: ["Model response was not valid JSON."],
    };
  }
}

function validateModelQuiz(value: unknown) {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      ok: false as const,
      errors: ["Generated quiz must be an object."],
    };
  }

  if (typeof value.question !== "string" || !value.question.trim()) {
    errors.push("question must be a non-empty string.");
  }

  if (!Array.isArray(value.answers) || value.answers.length !== 4) {
    errors.push("answers must contain exactly four items.");
  }

  const labels = new Set<string>();

  if (Array.isArray(value.answers)) {
    value.answers.forEach((answer, index) => {
      if (!isRecord(answer)) {
        errors.push(`answer ${index + 1} must be an object.`);
        return;
      }

      if (!isAnswerLabel(answer.label)) {
        errors.push(`answer ${index + 1} must use label A, B, C, or D.`);
      } else {
        labels.add(answer.label);
      }

      if (typeof answer.text !== "string" || !answer.text.trim()) {
        errors.push(`answer ${index + 1} text must be a non-empty string.`);
      }

      if (
        typeof answer.wrongExplanation !== "string" ||
        !answer.wrongExplanation.trim()
      ) {
        errors.push(
          `answer ${index + 1} wrongExplanation must be a non-empty string.`,
        );
      }
    });
  }

  if (labels.size !== 4) {
    errors.push("answers must include each label A, B, C, and D exactly once.");
  }

  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    value: value as ModelQuizResponse,
  };
}

function toQuiz(topicName: string, generated: ModelQuizResponse) {
  const topic: Topic = {
    id: toSlugId("topic", topicName),
    name: topicName,
  };

  const question: QuizQuestion = {
    id: toSlugId("question", `${topicName}-${generated.question}`),
    topicId: topic.id,
    prompt: generated.question.trim(),
    answers: [...generated.answers]
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((answer): QuizAnswer => ({
        id: toSlugId("answer", `${topicName}-${answer.label}-${answer.text}`),
        label: answer.label,
        text: answer.text.trim(),
        isCorrect: false,
        wrongExplanation: answer.wrongExplanation.trim(),
      })),
  };

  return { topic, question };
}

function errorResponse(
  code: GenerateQuizErrorResponse["error"]["code"],
  message: string,
  status: number,
  details?: string[],
) {
  return NextResponse.json<GenerateQuizResponse>(
    {
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    },
    { status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnswerLabel(value: unknown): value is QuizAnswer["label"] {
  return (
    typeof value === "string" &&
    answerLabels.includes(value as QuizAnswer["label"])
  );
}

function toSlugId(prefix: string, value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `${prefix}-${slug || "item"}`;
}
