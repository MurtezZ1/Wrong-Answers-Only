import { QuizBuilder } from "@/components/QuizBuilder";

export default function Home() {
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
          <QuizBuilder />
        </div>
      </section>
    </main>
  );
}
