"use client";

import { useMemo, useState } from "react";
import { mockGameState } from "@/data/mockQuiz";
import { presetTopics } from "@/data/topics";
import type { GenerateQuizResponse } from "@/types/generate";
import type { QuizQuestion, Topic } from "@/types/quiz";

const customTopicId = "topic-custom";

export function QuizBuilder() {
  const [selectedTopicId, setSelectedTopicId] = useState<Topic["id"] | null>(
    null,
  );
  const [customTopic, setCustomTopic] = useState("");
  const [question, setQuestion] = useState<QuizQuestion>(
    mockGameState.questions[mockGameState.currentQuestionIndex],
  );
  const [questionTopic, setQuestionTopic] = useState<Topic>(
    mockGameState.topic,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  async function handleGenerate() {
    if (!selectedTopic || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

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
        throw new Error(
          "error" in data
            ? data.error.message
            : "Quiz generation failed. Please try again.",
        );
      }

      setQuestion(data.quiz.question);
      setQuestionTopic(data.quiz.topic);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Quiz generation failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c24b32]">
          Make trivia confidently unserious
        </p>
        <h2 className="mt-5 text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
          Build a quiz where every answer is suspicious.
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-700">
          Pick a topic, then generate a playful multiple-choice quiz where every
          visible answer is intentionally wrong.
        </p>

        <div className="mt-8 w-full max-w-xl rounded-lg border border-neutral-950/15 bg-white p-4 shadow-[0_18px_45px_rgba(23,23,23,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <label
              className="text-sm font-black uppercase tracking-[0.16em] text-neutral-700"
              htmlFor="custom-topic"
            >
              Choose Topic
            </label>
            <span className="rounded-full bg-[#e2f0ef] px-3 py-1 text-xs font-black text-[#25585b]">
              {selectedTopic ?? "None selected"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {presetTopics.map((topic) => {
              const isSelected = selectedTopicId === topic.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={[
                    "min-h-12 rounded-md border px-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/15 disabled:cursor-not-allowed disabled:opacity-60",
                    isSelected
                      ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_10px_24px_rgba(23,23,23,0.16)]"
                      : "border-neutral-950/10 bg-[#fbfaf6] text-neutral-800 hover:border-[#2f6f73]/45 hover:bg-[#f4fbfa]",
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
              className="min-h-12 rounded-md bg-neutral-950 px-6 text-base font-bold text-white transition hover:bg-[#2f6f73] focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/25 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none"
              disabled={!canGenerate}
              onClick={handleGenerate}
              type="button"
            >
              {isLoading ? "Generating..." : "Generate"}
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-md border border-[#c24b32]/25 bg-[#fff4f1] p-3 text-sm font-semibold leading-6 text-[#8b2f20]">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>

      <aside
        aria-busy={isLoading}
        className="rounded-lg border border-neutral-950/15 bg-white p-5 shadow-[0_18px_45px_rgba(23,23,23,0.08)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-950/10 pb-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2f6f73]">
              {questionTopic.name} Quiz
            </p>
            <h3 className="mt-2 text-2xl font-black">{question.prompt}</h3>
          </div>
          <span className="rounded-full bg-[#f0c14b] px-3 py-1 text-sm font-black text-neutral-950">
            {isLoading ? "Loading" : "Wrong"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {question.answers.map((answer) => (
            <button
              className="flex min-h-16 w-full items-center gap-3 rounded-md border border-neutral-950/10 bg-[#fbfaf6] p-4 text-left transition hover:border-[#2f6f73]/45 hover:bg-[#f4fbfa] focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/15 disabled:cursor-wait disabled:opacity-65"
              disabled={isLoading}
              key={answer.id}
              type="button"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#c24b32] text-sm font-black text-white">
                {answer.label}
              </span>
              <span className="font-semibold text-neutral-800">
                {answer.text}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-md bg-[#e2f0ef] p-4 text-sm font-medium leading-6 text-[#25585b]">
          {isLoading
            ? "Generating a fresh set of plausible wrong answers."
            : "All visible answer choices are intentionally wrong. Explanations stay hidden until game logic is added."}
        </div>
      </aside>
    </>
  );
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
