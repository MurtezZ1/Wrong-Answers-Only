"use client";

import { useMemo, useState } from "react";
import { presetTopics } from "@/data/topics";
import type { Topic } from "@/types/quiz";

const customTopicId = "topic-custom";

export function TopicSelector() {
  const [selectedTopicId, setSelectedTopicId] = useState<Topic["id"] | null>(
    null,
  );
  const [customTopic, setCustomTopic] = useState("");

  const trimmedCustomTopic = customTopic.trim();

  const selectedTopic = useMemo(() => {
    if (selectedTopicId === customTopicId && trimmedCustomTopic) {
      return trimmedCustomTopic;
    }

    return (
      presetTopics.find((topic) => topic.id === selectedTopicId)?.name ?? null
    );
  }, [selectedTopicId, trimmedCustomTopic]);

  const canGenerate = Boolean(selectedTopic);

  return (
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
                "min-h-12 rounded-md border px-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/15",
                isSelected
                  ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_10px_24px_rgba(23,23,23,0.16)]"
                  : "border-neutral-950/10 bg-[#fbfaf6] text-neutral-800 hover:border-[#2f6f73]/45 hover:bg-[#f4fbfa]",
              ].join(" ")}
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
            "min-h-12 flex-1 rounded-md border bg-[#fbfaf6] px-4 text-base outline-none transition focus:border-[#2f6f73] focus:ring-4 focus:ring-[#2f6f73]/15",
            selectedTopicId === customTopicId
              ? "border-[#2f6f73]"
              : "border-neutral-950/10",
          ].join(" ")}
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
          type="button"
        >
          Generate
        </button>
      </div>
    </div>
  );
}
