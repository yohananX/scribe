import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white sm:items-start">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black">
          Scribe
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600">
          Turn handwritten exams into clean, school-branded documents.
        </p>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] md:w-[158px]"
          >
            Get Started
          </Link>
          <Link
            href="/docs/PROJECT_STRUCTURE.md"
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] md:w-[158px]"
          >
            Documentation
          </Link>
        </div>
      </main>
    </div>
  );
}
