import type { Topic } from "@/types/quiz";

export const presetTopics = [
  {
    id: "topic-history",
    name: "History",
    description: "Odd empires, stranger timelines, and suspicious monarchs.",
  },
  {
    id: "topic-science",
    name: "Science",
    description: "Facts, forces, formulas, and confidently wrong hypotheses.",
  },
  {
    id: "topic-movies",
    name: "Movies",
    description: "Plot twists, famous lines, and cinematic nonsense.",
  },
  {
    id: "topic-sports",
    name: "Sports",
    description: "Rules, rivalries, records, and questionable play calls.",
  },
  {
    id: "topic-programming",
    name: "Programming",
    description: "Languages, bugs, frameworks, and heroic semicolons.",
  },
  {
    id: "topic-random",
    name: "Random",
    description: "Let the quiz wander into delightful chaos.",
  },
] satisfies Topic[];
