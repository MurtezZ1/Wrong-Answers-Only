import { QuizBuilder } from "@/components/QuizBuilder";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] text-neutral-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-8 sm:py-6 lg:px-10">
        <nav
          aria-label="Primary"
          className="flex items-center justify-between gap-4 border-b border-neutral-950/10 pb-5"
        >
          <div>
            <p className="text-sm font-semibold uppercase text-[#2f6f73]">
              Quiz Builder
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
              Wrong Answers Only
            </h1>
          </div>
          <div className="hidden shrink-0 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white sm:block">
            Base App
          </div>
        </nav>

        <div className="grid flex-1 items-start gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.92fr)] lg:gap-10 lg:py-14">
          <QuizBuilder />
        </div>
      </section>
    </main>
  );
}
