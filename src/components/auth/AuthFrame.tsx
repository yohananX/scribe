import Link from "next/link";
import type { ReactNode } from "react";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: AuthFrameProps) {
  return (
    <main className="grid min-h-screen bg-[#f8f8f4] text-[#182725] lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative flex min-h-[230px] flex-col justify-between overflow-hidden bg-[#173b35] px-6 py-6 text-white before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(135deg,transparent_48%,rgba(255,255,255,0.035)_49%,rgba(255,255,255,0.035)_51%,transparent_52%)] before:bg-[size:28px_28px] sm:px-10 sm:py-8 lg:min-h-screen lg:px-14 lg:py-12">
        <Link href="/" className="relative flex w-fit items-center gap-2.5" aria-label="Scribe home">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[#d16b4b] text-sm font-bold">S</span>
          <span className="text-lg font-semibold tracking-tight">Scribe</span>
        </Link>
        <div className="relative mt-8 max-w-lg lg:my-auto lg:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e7b47a]">A clearer exam workflow</p>
          <h1 className="mt-4 max-w-md font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">
            From handwritten page to exam day.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#d1ded7] sm:text-base sm:leading-7">
            Keep the questions, school format and final paper together in one thoughtful process.
          </p>
        </div>
        <div className="relative hidden border-t border-white/15 pt-5 text-xs text-[#cfdbd4] sm:flex sm:gap-4 lg:gap-7">
          <span><b className="mr-2 text-[#e7b47a]">01</b>Capture</span>
          <span><b className="mr-2 text-[#e7b47a]">02</b>Review</span>
          <span><b className="mr-2 text-[#e7b47a]">03</b>Print</span>
        </div>
      </aside>

      <section className="flex items-start justify-center px-5 py-10 sm:items-center sm:px-10 sm:py-14 lg:px-16">
        <div className="w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a44f36]">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[#173b35] sm:text-4xl">{title}</h2>
          <p className="mt-3 mb-8 text-sm leading-6 text-[#64736c]">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}