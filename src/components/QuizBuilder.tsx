"use client";

import { useEffect, useMemo, useState } from "react";
import { presetTopics } from "@/data/topics";
import type {
  GenerateQuizErrorResponse,
  GenerateQuizResponse,
} from "@/types/generate";
import type { QuizQuestion, Topic } from "@/types/quiz";

const customTopicId = "topic-custom";
const statsStorageKey = "wrong-answers-only:stats:v1";

type GameStats = {
  totalAnswered: number;
  currentStreak: number;
  bestStreak: number;
  selectedTopics: Record<string, number>;
};

const initialStats: GameStats = {
  totalAnswered: 0,
  currentStreak: 0,
  bestStreak: 0,
  selectedTopics: {},
};

type AppError = GenerateQuizErrorResponse["error"];

export function QuizBuilder() {
  const [selectedTopicId, setSelectedTopicId] = useState<Topic["id"] | null>(
    null,
  );
  const [customTopic, setCustomTopic] = useState("");
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [questionTopic, setQuestionTopic] = useState<Topic | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appError, setAppError] = useState<AppError | null>(null);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [hasLoadedStats, setHasLoadedStats] = useState(false);

  const trimmedCustomTopic = customTopic.trim();

  const selectedTopic = useMemo(() => {
    if (selectedTopicId === customTopicId && trimmedCustomTopic) {
      return trimmedCustomTopic;
    }

    return (
      presetTopics.find((topic) => topic.id === selectedTopicId)?.name ?? null
    );
  }, [selectedTopicId, trimmedCustomTopic]);

  const canGenerate = Boolean(selectedTopic) && !isLoading;
  const selectedTopicCount = Object.keys(stats.selectedTopics).length;

  useEffect(() => {
    setStats(loadStoredStats());
    setHasLoadedStats(true);
  }, []);

  useEffect(() => {
    if (hasLoadedStats) {
      localStorage.setItem(statsStorageKey, JSON.stringify(stats));
    }
  }, [hasLoadedStats, stats]);

  async function handleGenerate() {
    if (!selectedTopic || isLoading) {
      setAppError({
        code: "invalid_request",
        message: "Choose a topic first, then let the nonsense begin.",
      });
      return;
    }

    setIsLoading(true);
    setAppError(null);
    setSelectedAnswerId(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: selectedTopic }),
      });

      const data = await readGenerateResponse(response);

      if (!response.ok || "error" in data) {
        setAppError(
          "error" in data
            ? data.error
            : {
                code: "generation_failed",
                message: "Quiz generation failed. Please try again.",
              },
        );
        return;
      }

      setQuestion(data.quiz.question);
      setQuestionTopic(data.quiz.topic);
      setSelectedAnswerId(null);
    } catch (error) {
      setAppError({
        code: "generation_failed",
        message:
          error instanceof Error
            ? error.message
            : "Quiz generation failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleAnswerSelect(answerId: string) {
    if (!question || !questionTopic) {
      return;
    }

    if (selectedAnswerId) {
      setSelectedAnswerId(answerId);
      return;
    }

    setSelectedAnswerId(answerId);
    setStats((currentStats) => {
      const nextCurrentStreak = currentStats.currentStreak + 1;

      return {
        totalAnswered: currentStats.totalAnswered + 1,
        currentStreak: nextCurrentStreak,
        bestStreak: Math.max(currentStats.bestStreak, nextCurrentStreak),
        selectedTopics: {
          ...currentStats.selectedTopics,
          [questionTopic.name]:
            (currentStats.selectedTopics[questionTopic.name] ?? 0) + 1,
        },
      };
    });
  }

  return (
    <>
      <div className="w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase text-[#c24b32]">
          Make trivia confidently unserious
        </p>
        <h2 className="mt-4 text-4xl font-black leading-[1.04] sm:mt-5 sm:text-6xl lg:text-7xl">
          Build a quiz where every answer is suspicious.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-700 sm:mt-6 sm:text-lg sm:leading-8">
          Pick a topic, then generate a playful multiple-choice quiz where every
          visible answer is intentionally wrong.
        </p>

        <section
          aria-labelledby="topic-picker-heading"
          className="mt-7 w-full max-w-xl rounded-lg border border-neutral-950/15 bg-white p-4 shadow-[0_18px_45px_rgba(23,23,23,0.08)] sm:mt-8 sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              className="text-sm font-black uppercase text-neutral-700"
              htmlFor="custom-topic"
              id="topic-picker-heading"
            >
              Choose Topic
            </label>
            <span
              aria-live="polite"
              className="w-fit rounded-full bg-[#e2f0ef] px-3 py-1 text-xs font-black text-[#25585b]"
            >
              {selectedTopic ?? "None selected"}
            </span>
          </div>

          <div
            aria-label="Preset topics"
            className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="group"
          >
            {presetTopics.map((topic) => {
              const isSelected = selectedTopicId === topic.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={[
                    "min-h-12 rounded-md border px-3 text-sm font-black transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/20 disabled:cursor-not-allowed disabled:opacity-60",
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_10px_24px_rgba(23,23,23,0.16)] hover:bg-neutral-800"
                      : "border-neutral-950/10 bg-[#fbfaf6] text-neutral-800 hover:-translate-y-0.5 hover:border-[#2f6f73]/45 hover:bg-[#f4fbfa] hover:shadow-[0_10px_20px_rgba(47,111,115,0.08)]",
                  ].join(" ")}
                  disabled={isLoading}
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  title={topic.description}
                  type="button"
                >
                  {topic.name}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              aria-describedby={!selectedTopic ? "topic-warning" : undefined}
              className={[
                "min-h-12 flex-1 rounded-md border bg-[#fbfaf6] px-4 text-base outline-none transition focus:border-[#2f6f73] focus:ring-4 focus:ring-[#2f6f73]/15 disabled:cursor-not-allowed disabled:opacity-60",
                selectedTopicId === customTopicId
                  ? "border-[#2f6f73]"
                  : "border-neutral-950/10",
              ].join(" ")}
              disabled={isLoading}
              id="custom-topic"
              name="topic"
              onChange={(event) => {
                setCustomTopic(event.target.value);
                setSelectedTopicId(customTopicId);
              }}
              onFocus={() => setSelectedTopicId(customTopicId)}
              placeholder="Custom topic, e.g. Ancient Rome"
              type="text"
              value={customTopic}
            />
            <button
              aria-label={isLoading ? "Generating quiz" : "Generate quiz"}
              className="min-h-12 rounded-md bg-neutral-950 px-6 text-base font-bold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#2f6f73] hover:shadow-[0_12px_24px_rgba(47,111,115,0.22)] focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none"
              disabled={!canGenerate}
              onClick={handleGenerate}
              type="button"
            >
              {isLoading ? "Generating..." : "Generate"}
            </button>
          </div>

          {appError ? (
            <div
              aria-live="polite"
              className="mt-4 rounded-md border border-[#c24b32]/25 bg-[#fff4f1] p-3 text-sm font-semibold leading-6 text-[#8b2f20]"
              role="status"
            >
              <p>{appError.message}</p>
              {selectedTopic ? (
                <button
                  aria-label="Retry quiz generation"
                  className="mt-3 min-h-10 rounded-md bg-[#8b2f20] px-4 text-sm font-black text-white transition hover:bg-[#6f2418] focus:outline-none focus:ring-4 focus:ring-[#c24b32]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  onClick={handleGenerate}
                  type="button"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : !selectedTopic ? (
            <p
              className="mt-4 rounded-md border border-[#f0c14b]/35 bg-[#fff9e8] p-3 text-sm font-semibold leading-6 text-[#7a5a05]"
              id="topic-warning"
            >
              No topic selected yet. Pick a preset or type your own to unlock
              Generate.
            </p>
          ) : null}
        </section>

        <section
          aria-label="Game stats"
          className="mt-4 grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4"
        >
          <StatCard label="Answered" value={stats.totalAnswered} />
          <StatCard label="Streak" value={stats.currentStreak} />
          <StatCard label="Best" value={stats.bestStreak} />
          <StatCard label="Topics" value={selectedTopicCount} />
        </section>
      </div>

      <aside
        aria-label="Quiz panel"
        aria-busy={isLoading}
        className="min-h-[520px] rounded-lg border border-neutral-950/15 bg-white p-4 shadow-[0_18px_45px_rgba(23,23,23,0.08)] transition sm:min-h-[560px] sm:p-6"
      >
        {isLoading ? (
          <LoadingQuizCard />
        ) : appError && !question ? (
          <ApiErrorState
            code={appError.code}
            canRetry={Boolean(selectedTopic)}
            message={appError.message}
            onRetry={handleGenerate}
          />
        ) : question && questionTopic ? (
          <GeneratedQuizCard
            onAnswerSelect={handleAnswerSelect}
            onNextQuestion={() => setSelectedAnswerId(null)}
            question={question}
            questionTopic={questionTopic}
            selectedAnswerId={selectedAnswerId}
          />
        ) : (
          <EmptyQuizState hasSelectedTopic={Boolean(selectedTopic)} />
        )}
      </aside>
    </>
  );
}

function EmptyQuizState({ hasSelectedTopic }: { hasSelectedTopic: boolean }) {
  return (
    <div className="flex min-h-[500px] flex-col justify-center">
      <div className="rounded-lg border border-dashed border-neutral-950/20 bg-[#fbfaf6] p-5 sm:p-6">
        <p className="text-sm font-black uppercase text-[#2f6f73]">
          Ready When You Are
        </p>
        <h3 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
          {hasSelectedTopic
            ? "Generate your first suspicious quiz."
            : "Pick a topic to start the nonsense."}
        </h3>
        <p className="mt-4 text-base font-medium leading-7 text-neutral-700">
          The quiz will appear here with four convincing wrong answers and a
          tiny explanation waiting behind each choice.
        </p>
      </div>

      <div className="mt-5 rounded-md bg-[#e2f0ef] p-4 text-sm font-semibold leading-6 text-[#25585b]">
        {hasSelectedTopic
          ? "Your topic is set. Hit Generate when you are ready."
          : "No topic selected yet, so Generate is taking a responsible little nap."}
      </div>
    </div>
  );
}

function LoadingQuizCard() {
  return (
    <div aria-label="Generating quiz" className="animate-pulse" role="status">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-950/10 pb-5">
        <div className="w-full">
          <div className="h-4 w-32 rounded-full bg-[#e2f0ef]" />
          <div className="mt-4 h-8 w-4/5 rounded-md bg-neutral-200" />
          <div className="mt-2 h-8 w-3/5 rounded-md bg-neutral-200" />
        </div>
        <div className="h-8 w-20 rounded-full bg-[#f0c14b]/70" />
      </div>

      <div className="mt-5 space-y-3">
        {["A", "B", "C", "D"].map((label) => (
          <div
            className="flex min-h-16 items-center gap-3 rounded-md border border-neutral-950/10 bg-[#fbfaf6] p-4"
            key={label}
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#c24b32]/70 text-sm font-black text-white">
              {label}
            </div>
            <div className="h-4 flex-1 rounded-full bg-neutral-200" />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-md bg-[#e2f0ef] p-4 text-sm font-semibold leading-6 text-[#25585b]">
        Generating a fresh set of plausible wrong answers.
      </div>
    </div>
  );
}

function ApiErrorState({
  canRetry,
  code,
  message,
  onRetry,
}: {
  canRetry: boolean;
  code: AppError["code"];
  message: string;
  onRetry: () => void;
}) {
  const isMissingApiKey = code === "missing_api_key";

  return (
    <div className="flex min-h-[500px] flex-col justify-center">
      <div
        aria-live="polite"
        className="rounded-lg border border-[#c24b32]/25 bg-[#fff4f1] p-5 sm:p-6"
        role="alert"
      >
        <p className="text-sm font-black uppercase text-[#c24b32]">
          {isMissingApiKey ? "API Key Required" : "Generation Stumbled"}
        </p>
        <h3 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
          {isMissingApiKey
            ? "Connect Gemini to generate quizzes."
            : "The quiz refused to be wrong on command."}
        </h3>
        <p className="mt-4 text-base font-semibold leading-7 text-[#8b2f20]">
          {message}
        </p>
        {isMissingApiKey ? (
          <div className="mt-4 rounded-md border border-[#c24b32]/15 bg-white/65 p-4 text-sm font-semibold leading-6 text-[#8b2f20]">
            <p>Create `C:\Users\ERJON\Desktop\Wrong-Answers-Only\.env.local`:</p>
            <code className="mt-2 block rounded-md bg-neutral-950 p-3 text-white">
              GEMINI_API_KEY=your_google_ai_studio_api_key_here
            </code>
            <p className="mt-3">Then restart the dev server and try again.</p>
          </div>
        ) : null}
        {canRetry ? (
          <button
            aria-label="Retry quiz generation"
            className="mt-5 min-h-12 rounded-md bg-[#8b2f20] px-5 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#6f2418] hover:shadow-[0_12px_24px_rgba(139,47,32,0.18)] focus:outline-none focus:ring-4 focus:ring-[#c24b32]/20"
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

function GeneratedQuizCard({
  onAnswerSelect,
  onNextQuestion,
  question,
  questionTopic,
  selectedAnswerId,
}: {
  onAnswerSelect: (answerId: string) => void;
  onNextQuestion: () => void;
  question: QuizQuestion;
  questionTopic: Topic;
  selectedAnswerId: string | null;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-neutral-950/10 pb-5">
        <div>
          <p className="text-sm font-bold uppercase text-[#2f6f73]">
            {questionTopic.name} Quiz
          </p>
          <h3 className="mt-2 text-xl font-black leading-tight sm:text-2xl">
            {question.prompt}
          </h3>
        </div>
        <span
          aria-live="polite"
          className="shrink-0 rounded-full bg-[#f0c14b] px-3 py-1 text-sm font-black text-neutral-950"
        >
          {selectedAnswerId ? "Nice Try" : "Wrong"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {question.answers.map((answer) => {
          const isSelected = selectedAnswerId === answer.id;
          const isDimmed = Boolean(selectedAnswerId) && !isSelected;

          return (
            <div className="space-y-2" key={answer.id}>
              <button
                aria-pressed={isSelected}
                aria-label={`Select answer ${answer.label}: ${answer.text}`}
                className={[
                  "flex min-h-16 w-full items-center gap-3 rounded-md border p-4 text-left transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/20",
                  isSelected
                    ? "border-[#2f6f73] bg-[#e2f0ef] shadow-[0_12px_28px_rgba(47,111,115,0.16)]"
                    : "border-neutral-950/10 bg-[#fbfaf6] hover:-translate-y-0.5 hover:border-[#2f6f73]/45 hover:bg-[#f4fbfa] hover:shadow-[0_10px_20px_rgba(47,111,115,0.08)]",
                  isDimmed ? "opacity-55" : "opacity-100",
                ].join(" ")}
                onClick={() => onAnswerSelect(answer.id)}
                type="button"
              >
                <span
                  className={[
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-black text-white transition",
                    isSelected ? "bg-[#2f6f73]" : "bg-[#c24b32]",
                  ].join(" ")}
                >
                  {answer.label}
                </span>
                <span className="font-semibold text-neutral-800">
                  {answer.text}
                </span>
              </button>

              {isSelected ? (
                <div className="rounded-md border border-[#2f6f73]/20 bg-[#f4fbfa] p-4 text-sm font-semibold leading-6 text-[#25585b] transition duration-200 ease-out">
                  {answer.wrongExplanation ??
                    "A bold guess, but this answer has wandered confidently away from the facts."}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedAnswerId ? (
        <button
          aria-label="Clear current answer selection"
          className="mt-6 min-h-12 w-full rounded-md bg-neutral-950 px-5 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2f6f73] hover:shadow-[0_12px_24px_rgba(47,111,115,0.22)] focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/25"
          onClick={onNextQuestion}
          type="button"
        >
          Next Question
        </button>
      ) : (
        <div className="mt-6 rounded-md bg-[#e2f0ef] p-4 text-sm font-medium leading-6 text-[#25585b]">
          Pick the answer that feels almost right. The app will explain why it
          absolutely is not.
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-950/10 bg-white p-3 shadow-[0_10px_24px_rgba(23,23,23,0.05)] sm:p-4">
      <p className="text-xs font-black uppercase text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-neutral-950">{value}</p>
    </div>
  );
}

function loadStoredStats() {
  try {
    const storedStats = localStorage.getItem(statsStorageKey);

    if (!storedStats) {
      return initialStats;
    }

    const parsedStats = JSON.parse(storedStats) as unknown;

    if (!isStoredStats(parsedStats)) {
      return initialStats;
    }

    return parsedStats;
  } catch {
    return initialStats;
  }
}

function isStoredStats(value: unknown): value is GameStats {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const stats = value as Partial<GameStats>;

  return (
    isSafeNumber(stats.totalAnswered) &&
    isSafeNumber(stats.currentStreak) &&
    isSafeNumber(stats.bestStreak) &&
    typeof stats.selectedTopics === "object" &&
    stats.selectedTopics !== null &&
    !Array.isArray(stats.selectedTopics)
  );
}

function isSafeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

async function readGenerateResponse(response: Response) {
  const fallbackMessage = response.ok
    ? "Quiz generation returned an unreadable response."
    : "Quiz generation failed. Please try again.";

  try {
    return (await response.json()) as GenerateQuizResponse;
  } catch {
    return {
      error: {
        code: "generation_failed",
        message: fallbackMessage,
      },
    } satisfies GenerateQuizResponse;
  }
}
