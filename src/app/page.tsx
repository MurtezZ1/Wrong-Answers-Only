import { mockGameState } from "@/data/mockQuiz";
import { TopicSelector } from "@/components/TopicSelector";

export default function Home() {
  const currentQuestion =
    mockGameState.questions[mockGameState.currentQuestionIndex];

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-neutral-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-neutral-950/10 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6f73]">
              Quiz Builder
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Wrong Answers Only
            </h1>
          </div>
          <div className="hidden rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white sm:block">
            Base App
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_0.92fr] lg:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c24b32]">
              Make trivia confidently unserious
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              Build a quiz where every answer is suspicious.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-700">
              Enter a topic, then generate a playful multiple-choice quiz full
              of intentionally wrong answers. AI generation comes later; this
              first pass keeps the experience sharp and ready for production.
            </p>

            <TopicSelector />
          </div>

          <aside className="rounded-lg border border-neutral-950/15 bg-white p-5 shadow-[0_18px_45px_rgba(23,23,23,0.08)] sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-950/10 pb-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2f6f73]">
                  {mockGameState.topic.name} Quiz
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  {currentQuestion.prompt}
                </h3>
              </div>
              <span className="rounded-full bg-[#f0c14b] px-3 py-1 text-sm font-black text-neutral-950">
                Mock
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {currentQuestion.answers.map((answer) => (
                <button
                  className="flex min-h-16 w-full items-center gap-3 rounded-md border border-neutral-950/10 bg-[#fbfaf6] p-4 text-left transition hover:border-[#2f6f73]/45 hover:bg-[#f4fbfa] focus:outline-none focus:ring-4 focus:ring-[#2f6f73]/15"
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
              Quiz generation is intentionally paused for now. This card is
              rendering from a typed mock game state for local testing.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
