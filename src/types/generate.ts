import type { QuizQuestion, Topic } from "@/types/quiz";

export type GenerateQuizRequest = {
  topic: string;
};

export type GeneratedWrongAnswer = {
  label: "A" | "B" | "C" | "D";
  text: string;
  wrongExplanation: string;
};

export type GeneratedQuizQuestion = {
  topic: Topic;
  question: QuizQuestion;
};

export type GenerateQuizSuccessResponse = {
  quiz: GeneratedQuizQuestion;
};

export type GenerateQuizErrorResponse = {
  error: {
    code:
      | "invalid_json"
      | "invalid_request"
      | "missing_api_key"
      | "generation_failed"
      | "invalid_generation";
    message: string;
    details?: string[];
  };
};

export type GenerateQuizResponse =
  | GenerateQuizSuccessResponse
  | GenerateQuizErrorResponse;
