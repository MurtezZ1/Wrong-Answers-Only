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
const maxGenerationAttempts = 3;
const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";
const openRouterModels = [
  "deepseek/deepseek-v4-flash:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "moonshotai/kimi-k2.6:free",
] as const;

const systemPrompt = [
  "You are the quiz writer for Wrong Answers Only.",
  "Create trivia questions where the real correct answer exists, but is never included in the answer options or JSON.",
  "Every visible option must be plausible enough to tempt a player, but factually wrong.",
  "Never include the correct answer, a synonym of the correct answer, a partly correct answer, or an all-of-the-above/none-of-the-above answer.",
  "Each wrong answer must include a short, witty explanation of why it is wrong.",
  "Return strict JSON only. Do not include Markdown, comments, prose, code fences, or extra keys.",
].join(" ");

type ModelQuizAnswer = {
  label: QuizAnswer["label"];
  text: string;
  wrongExplanation: string;
};

type ModelQuizResponse = {
  question: string;
  answers: ModelQuizAnswer[];
};

type ValidationResponse = {
  hasPotentiallyCorrectAnswer: boolean;
  riskyLabels: QuizAnswer["label"][];
  reason: string;
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

const validationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hasPotentiallyCorrectAnswer", "riskyLabels", "reason"],
  properties: {
    hasPotentiallyCorrectAnswer: {
      type: "boolean",
    },
    riskyLabels: {
      type: "array",
      items: {
        type: "string",
        enum: answerLabels,
      },
    },
    reason: {
      type: "string",
    },
  },
} as const;

const fallbackQuiz: ModelQuizResponse = {
  question: "Which of these is a real programming language keyword in JavaScript?",
  answers: [
    {
      label: "A",
      text: "sandwich",
      wrongExplanation:
        "JavaScript has many quirks, but lunch has not become a reserved word yet.",
    },
    {
      label: "B",
      text: "moonwalk",
      wrongExplanation:
        "Great for stage entrances, not recognized by the JavaScript parser.",
    },
    {
      label: "C",
      text: "accordion",
      wrongExplanation:
        "Useful in UI design, but JavaScript will not compile a musical instrument.",
    },
    {
      label: "D",
      text: "velociraptor",
      wrongExplanation:
        "Fast and memorable, but still not a keyword in the language.",
    },
  ],
};

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

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return errorResponse(
      "missing_api_key",
      "OpenRouter generation is not set up yet. Add OPENROUTER_API_KEY to .env.local, then restart the dev server.",
      503,
    );
  }

  try {
    const generatedQuiz = await generateValidatedQuiz(
      apiKey,
      topicResult.topic,
    );

    return NextResponse.json<GenerateQuizResponse>({
      quiz: toQuiz(topicResult.topic, generatedQuiz),
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

function buildUserPrompt(topic: string) {
  return [
    `Topic: ${topic}`,
    "Generate one trivia-style question about this topic.",
    "The question must have one real, factual correct answer, but you must not reveal or include that correct answer anywhere.",
    "Create exactly four multiple-choice answers labeled A, B, C, and D.",
    "All four answers must be plausible, specific, and factually wrong.",
    "For each answer, write a short hidden wrongExplanation that is witty and explains why the answer is wrong.",
    'Return JSON only in this exact shape: {"question":"...","answers":[{"label":"A","text":"...","wrongExplanation":"..."},{"label":"B","text":"...","wrongExplanation":"..."},{"label":"C","text":"...","wrongExplanation":"..."},{"label":"D","text":"...","wrongExplanation":"..."}]}',
  ].join("\n");
}

async function generateValidatedQuiz(apiKey: string, topic: string) {
  for (let attempt = 1; attempt <= maxGenerationAttempts; attempt += 1) {
    const generatedQuiz = await generateQuiz(apiKey, topic);
    const validation = await validateWrongAnswers(apiKey, generatedQuiz);

    // The first LLM call creates the quiz. This second LLM call acts as a
    // reviewer and tries to catch any option that might actually answer the
    // question. If the reviewer flags a risky option, the whole question is
    // discarded and regenerated so the user never sees a potentially correct
    // answer.
    if (!validation.hasPotentiallyCorrectAnswer) {
      return generatedQuiz;
    }
  }

  // If every generated attempt is risky, return a hand-authored fallback whose
  // options are intentionally absurd and known to be wrong. This keeps the app
  // usable while still preserving the no-correct-answer rule.
  return fallbackQuiz;
}

async function generateQuiz(apiKey: string, topic: string) {
  const userPrompt = buildUserPrompt(topic);

  const outputText = await callOpenRouter(apiKey, [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ], "wrong_answers_only_quiz", responseSchema);

  const parsed = parseModelOutput(outputText);

  if (!parsed.ok) {
    throw new Error(parsed.errors.join(" "));
  }

  return parsed.value;
}

async function validateWrongAnswers(
  apiKey: string,
  generatedQuiz: ModelQuizResponse,
) {
  const outputText = await callOpenRouter(apiKey, [
    {
      role: "system",
      content:
        "You are a strict fact-checking reviewer. Return JSON only and follow the schema exactly.",
    },
    {
      role: "user",
      content: buildValidationPrompt(generatedQuiz),
    },
  ], "wrong_answers_only_validation", validationSchema);

  const parsed = parseValidationOutput(outputText);

  if (!parsed.ok) {
    return {
      hasPotentiallyCorrectAnswer: true,
      riskyLabels: [...answerLabels],
      reason:
        "Validation response could not be parsed, so the generated quiz was treated as unsafe.",
    } satisfies ValidationResponse;
  }

  return parsed.value;
}

async function callOpenRouter(
  apiKey: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
  schemaName: string,
  schema: object,
) {
  const errors: string[] = [];

  for (const model of openRouterModels) {
    const response = await fetch(openRouterApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Wrong Answers Only",
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) {
      errors.push(await response.text());
      continue;
    }

    return readOpenRouterContent((await response.json()) as unknown);
  }

  throw new Error(`OpenRouter request failed: ${errors.join(" | ")}`);
}

function readOpenRouterContent(data: unknown) {
  if (!isRecord(data)) {
    throw new Error("OpenRouter response was not an object.");
  }

  const choices = data.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("OpenRouter response did not include choices.");
  }

  const firstChoice = choices[0] as unknown;

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("OpenRouter response did not include a message.");
  }

  const content = firstChoice.message.content;

  if (typeof content !== "string") {
    throw new Error("OpenRouter response content was not text.");
  }

  return content;
}

function buildValidationPrompt(generatedQuiz: ModelQuizResponse) {
  return [
    "You are a strict fact-checking reviewer for a game called Wrong Answers Only.",
    "Review the trivia question and all four visible answer options.",
    "Mark hasPotentiallyCorrectAnswer true if any option is correct, partly correct, a synonym/paraphrase of the correct answer, or could reasonably be accepted as correct.",
    "Mark it false only when every option is clearly factually wrong.",
    "Return strict JSON only.",
    "",
    `Question: ${generatedQuiz.question}`,
    ...generatedQuiz.answers.map(
      (answer) => `${answer.label}. ${answer.text}`,
    ),
  ].join("\n");
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
  const trimmedOutput = outputText.trim();

  if (!trimmedOutput) {
    return {
      ok: false as const,
      errors: ["Model response was empty."],
    };
  }

  const primaryParse = safeParseJson(trimmedOutput);

  if (primaryParse.ok) {
    return validateModelQuiz(primaryParse.value);
  }

  const extractedJson = extractJsonObject(trimmedOutput);

  if (extractedJson && extractedJson !== trimmedOutput) {
    const fallbackParse = safeParseJson(extractedJson);

    if (fallbackParse.ok) {
      return validateModelQuiz(fallbackParse.value);
    }
  }

  return {
    ok: false as const,
    errors: [
      "Model response was not valid JSON.",
      primaryParse.error,
      "The model may have returned prose, Markdown, or malformed JSON.",
    ],
  };
}

function parseValidationOutput(outputText: string) {
  const trimmedOutput = outputText.trim();

  if (!trimmedOutput) {
    return {
      ok: false as const,
      errors: ["Validation response was empty."],
    };
  }

  const primaryParse = safeParseJson(trimmedOutput);

  if (primaryParse.ok) {
    return validateValidationResponse(primaryParse.value);
  }

  const extractedJson = extractJsonObject(trimmedOutput);

  if (extractedJson && extractedJson !== trimmedOutput) {
    const fallbackParse = safeParseJson(extractedJson);

    if (fallbackParse.ok) {
      return validateValidationResponse(fallbackParse.value);
    }
  }

  return {
    ok: false as const,
    errors: ["Validation response was not valid JSON.", primaryParse.error],
  };
}

function safeParseJson(text: string) {
  try {
    return {
      ok: true as const,
      value: JSON.parse(text) as unknown,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unknown JSON error.",
    };
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
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

function validateValidationResponse(value: unknown) {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      ok: false as const,
      errors: ["Validation response must be an object."],
    };
  }

  if (typeof value.hasPotentiallyCorrectAnswer !== "boolean") {
    errors.push("hasPotentiallyCorrectAnswer must be a boolean.");
  }

  if (!Array.isArray(value.riskyLabels)) {
    errors.push("riskyLabels must be an array.");
  } else {
    value.riskyLabels.forEach((label, index) => {
      if (!isAnswerLabel(label)) {
        errors.push(`riskyLabels item ${index + 1} must be A, B, C, or D.`);
      }
    });
  }

  if (typeof value.reason !== "string" || !value.reason.trim()) {
    errors.push("reason must be a non-empty string.");
  }

  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  const riskyLabels = Array.isArray(value.riskyLabels)
    ? value.riskyLabels.filter(isAnswerLabel)
    : [];
  const reason = typeof value.reason === "string" ? value.reason.trim() : "";

  return {
    ok: true as const,
    value: {
      hasPotentiallyCorrectAnswer: Boolean(value.hasPotentiallyCorrectAnswer),
      riskyLabels,
      reason,
    },
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
