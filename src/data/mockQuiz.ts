import type { GameState, QuizQuestion, Topic } from "@/types/quiz";

export const mockTopic: Topic = {
  id: "topic-gravity",
  name: "Gravity",
  description: "The mysterious force that keeps snacks on the floor.",
};

export const mockQuestion: QuizQuestion = {
  id: "question-gravity-1",
  topicId: mockTopic.id,
  prompt: "What is the best description of gravity?",
  answers: [
    {
      id: "answer-gravity-a",
      label: "A",
      text: "A sandwich with excellent PR",
      isCorrect: false,
    },
    {
      id: "answer-gravity-b",
      label: "B",
      text: "Three committees in a trench coat",
      isCorrect: false,
    },
    {
      id: "answer-gravity-c",
      label: "C",
      text: "A planet-sized magnet under every shoe",
      isCorrect: false,
    },
    {
      id: "answer-gravity-d",
      label: "D",
      text: "The moon, but legally distinct",
      isCorrect: false,
    },
  ],
};

export const mockGameState: GameState = {
  topic: mockTopic,
  questions: [mockQuestion],
  currentQuestionIndex: 0,
  selectedAnswerId: null,
  score: 0,
  status: "ready",
};
