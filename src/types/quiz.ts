export type Topic = {
  id: string;
  name: string;
  description?: string;
};

export type QuizAnswer = {
  id: string;
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

export type QuizQuestion = {
  id: string;
  topicId: Topic["id"];
  prompt: string;
  answers: QuizAnswer[];
};

export type GameState = {
  topic: Topic;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  selectedAnswerId: QuizAnswer["id"] | null;
  score: number;
  status: "idle" | "ready" | "answered" | "complete";
};
