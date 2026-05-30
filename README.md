# Wrong Answers Only

Wrong Answers Only is a playful AI-powered trivia app where every visible
multiple-choice option is intentionally wrong. The app rewards participation,
streaks, and curiosity instead of correctness.

## Live Demo

Coming soon: `https://your-live-demo-url.example`

## GitHub Repo

Coming soon: `https://github.com/your-username/wrong-answers-only`

## Features

- Topic selection with preset topics and custom topic input
- AI-generated trivia questions through a Next.js API route
- Four plausible but factually wrong answer choices
- Hidden witty explanations for why selected answers are wrong
- No correct answer shown anywhere in the UI
- Loading skeleton, empty state, retry state, and friendly API errors
- Local score tracking with `localStorage`
- Participation-based stats: answered count, current streak, best streak, and topic count
- Responsive, polished UI built with Tailwind CSS

## Tech Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- React 19
- OpenAI Responses API
- Local browser storage for lightweight score persistence

## Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` manually in the project root.

Add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Run the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Run checks:

```bash
npm run lint
npm run build
```

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Used by `/api/generate` to call the OpenAI API. |

The key is only used server-side in the API route and should never be exposed
to the browser.

## No-Correct-Answer Rule

The app enforces the no-correct-answer rule in several layers:

1. The system prompt tells the model never to include the correct answer, a
   synonym of the correct answer, a partly correct answer, or
   all-of-the-above/none-of-the-above options.
2. The user prompt requires a real trivia question with a real correct answer,
   but explicitly forbids showing that answer anywhere.
3. The API requests strict JSON using a schema with exactly four answer objects.
4. The server transforms every returned answer into `isCorrect: false`.
5. The frontend never renders a correct answer field. It only displays the
   wrong answer text and the selected answer's hidden explanation.

## AI Prompts Used

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

Error responses use a consistent shape:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Topic is required before a quiz can be generated.",
    "details": ["topic must be at least 2 characters."]
  }
}
```

## What I Would Improve With More Time

- Add multi-question quiz sessions instead of one question at a time
- Add a real "next question" generation flow
- Add answer explanation animations and sound-light feedback
- Add topic history and recent quiz sessions
- Add automated tests for the API route and parsing fallback
- Add moderation or stricter topic filtering for public deployment
- Add shareable results cards

## What Surprised Me

The most interesting design challenge was making a quiz game where correctness
is deliberately absent. The scoring had to reward participation and streaks
instead of right answers, and the prompt needed to make the model generate a
real trivia question while hiding the real answer completely.

## Deployment on Replit

1. Create a new Replit project and import the GitHub repository.
2. In Replit Secrets, add:

```text
OPENAI_API_KEY=your_openai_api_key_here
```

3. Install dependencies:

```bash
npm install
```

4. Set the run command to:

```bash
npm run dev
```

For a production-style Replit deployment, use:

```bash
npm run build
npm run start
```

5. Make sure the app is served on the port provided by Replit. Next.js will
   read `process.env.PORT` automatically in many hosting environments when
   started through the platform.

## Notes

- The app intentionally does not reveal correct answers.
- `wrongExplanation` is shown only after a user selects an answer.
- Scores are local to the user's browser through `localStorage`.
- Missing or invalid API responses are handled with friendly retry states.
