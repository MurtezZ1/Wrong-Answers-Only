# Wrong Answers Only

## Project Overview

Wrong Answers Only is an AI-powered trivia game where every visible answer is
plausible, witty, and intentionally wrong. The player chooses a topic, the app
generates a trivia-style question, and the answer choices are all incorrect by
design. The score rewards participation and streak continuation instead of
traditional correctness.

GitHub Repository URL: https://github.com/MurtezZ1/Wrong-Answers-Only.git

Live Replit URL: https://wrong-answers-only-1--murteziloni.replit.app/

## Features

- Preset topic buttons: History, Science, Movies, Sports, Programming, Random
- Custom topic input
- Gemini-backed quiz generation through a server-only Next.js API route
- One generated question with four plausible-but-wrong answer choices
- Witty explanation revealed after selecting an answer
- No correct answer rendered in the UI
- Loading skeleton, empty state, friendly error state, and retry actions
- Participation score, current streak, best streak, and topic count
- `localStorage` persistence for score and streak data
- Responsive, polished interface with accessible labels and focus states
- Replit-ready configuration

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- OpenRouter API with an OpenAI-compatible chat endpoint
- Browser `localStorage`

## Setup Instructions

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env.local
```

Add your Google AI Studio key to `.env.local`:

```env
OPENROUTER_API_KEY=your_key_here
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run quality checks:

```bash
npm run lint
npm run build
```

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | Server-side key used by `/api/generate` to call OpenRouter. |

The key is read only in the server route. It is not exposed to client-side
React components.

## Deployment

### Replit

This project includes `.replit`.

The Replit run command is:

```bash
npm run dev:replit
```

That script starts Next.js on `0.0.0.0:3000`, allowing Replit to expose the app
on its public URL.

Steps:

1. Create a new Replit project.
2. Import the GitHub repository.
3. Add a Replit Secret named `OPENROUTER_API_KEY`.
4. Press **Run**.
5. Open the public Replit URL.

For Replit deployments, `.replit` runs:

```bash
npm run build && npm run start:replit
```

### Local Production Check

```bash
npm run build
npm run start
```

## No-Correct-Answer Enforcement

The no-correct-answer rule is enforced in several layers:

1. The system prompt explicitly forbids correct, partly correct, synonym, and
   all-of-the-above/none-of-the-above answers.
2. The user prompt requires a real trivia question with a real correct answer,
   but forbids revealing that correct answer anywhere.
3. OpenRouter is asked for structured JSON matching a schema with exactly four
   answer objects.
4. The server validates the response shape before returning it.
5. The server maps every answer to `isCorrect: false`.
6. The frontend never renders or stores a correct-answer field.

## Prompts Used

### System Prompt

```text
You are the quiz writer for Wrong Answers Only. Create trivia questions where the real correct answer exists, but is never included in the answer options or JSON. Every visible option must be plausible enough to tempt a player, but factually wrong. Never include the correct answer, a synonym of the correct answer, a partly correct answer, or an all-of-the-above/none-of-the-above answer. Each wrong answer must include a short, witty explanation of why it is wrong. Return strict JSON only. Do not include Markdown, comments, prose, code fences, or extra keys.
```

### User Prompt

```text
Topic: {topic}
Generate one trivia-style question about this topic.
The question must have one real, factual correct answer, but you must not reveal or include that correct answer anywhere.
Create exactly four multiple-choice answers labeled A, B, C, and D.
All four answers must be plausible, specific, and factually wrong.
For each answer, write a short hidden wrongExplanation that is witty and explains why the answer is wrong.
Return JSON only in this exact shape: {"question":"...","answers":[{"label":"A","text":"...","wrongExplanation":"..."},{"label":"B","text":"...","wrongExplanation":"..."},{"label":"C","text":"...","wrongExplanation":"..."},{"label":"D","text":"...","wrongExplanation":"..."}]}
```

## API Contract

`POST /api/generate`

Request:

```json
{
  "topic": "Science"
}
```

Success response:

```json
{
  "quiz": {
    "topic": {
      "id": "topic-science",
      "name": "Science"
    },
    "question": {
      "id": "question-science-example",
      "topicId": "topic-science",
      "prompt": "Trivia question text",
      "answers": [
        {
          "id": "answer-science-a-example",
          "label": "A",
          "text": "Plausible wrong answer",
          "isCorrect": false,
          "wrongExplanation": "Witty explanation"
        }
      ]
    }
  }
}
```

Error response:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Topic is required before a quiz can be generated.",
    "details": ["topic must be at least 2 characters."]
  }
}
```

## Future Improvements

- Add true multi-question sessions
- Generate the next question automatically after answering
- Add an optional second-pass verifier to reduce the chance of accidental
  correct answers
- Add unit tests for the API route and JSON parsing fallback
- Add rate limiting and topic moderation for public deployment
- Add shareable result cards
- Add a reset-stats button

## What Surprised Me

The hardest design challenge was making a trivia game where correctness is
intentionally absent. The prompt needs to create a question with a real answer
while hiding that answer, and the scoring model has to reward participation
rather than correctness.

