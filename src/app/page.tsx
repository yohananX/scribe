import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getProfile(supabase, user.id);
    redirect(profile?.organisation_id ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7f3] text-[#182725]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Scribe home">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#176c5c] text-sm font-bold text-white">S</span>
          <span className="text-lg font-semibold tracking-tight">Scribe</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <Link href="/login" className="px-3 py-2 text-sm font-semibold text-[#40534f] transition-colors hover:text-[#176c5c]">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-md bg-[#176c5c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#105548] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5c]">
            Create account
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 md:pb-24 md:pt-16 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-12">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#a44f36]">
            <span className="h-2 w-2 rounded-full bg-[#d16b4b]" />
            Built for the work teachers do
          </p>
          <h1 className="max-w-xl font-serif text-5xl leading-[1.04] tracking-tight text-[#173b35] sm:text-6xl lg:text-7xl">
            Handwritten exams, ready for print.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#52635e] sm:text-lg sm:leading-8">
            Turn photographed exam pages into clear, editable documents that carry your school&apos;s format from the first question to the final page.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#176c5c] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#105548] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5c]">
              Start with Scribe <span aria-hidden="true" className="ml-3 text-lg">-&gt;</span>
            </Link>
            <span className="text-sm text-[#6a7873]">Already have an account? <Link href="/login" className="font-semibold text-[#176c5c] underline decoration-[#9cb8ae] underline-offset-4 hover:text-[#105548]">Sign in</Link></span>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#d9dfd8] pt-5 text-xs font-medium text-[#61716b]">
            <span>Capture pages</span><span aria-hidden="true">/</span><span>Review the draft</span><span aria-hidden="true">/</span><span>Print with confidence</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]" aria-label="Preview of a formatted Scribe exam">
          <div className="relative rounded-[10px] border border-[#d6ded5] bg-[#e9ede6] p-4 shadow-[0_24px_70px_-36px_rgba(31,66,57,0.48)] sm:p-7">
            <div className="mb-4 flex items-center justify-between border-b border-[#d0d9d0] pb-3">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#d16b4b]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e6b75d]" /><span className="h-2.5 w-2.5 rounded-full bg-[#71a58b]" /></div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#708078]">Exam preview</span>
              <span className="rounded bg-white px-2 py-1 text-[10px] font-medium text-[#52635e]">Ready to review</span>
            </div>
            <article className="mx-auto max-w-[370px] bg-white px-6 py-7 shadow-sm sm:px-9 sm:py-8">
              <div className="border-b-2 border-[#176c5c] pb-4 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#176c5c]">Springfield Academy</p>
                <h2 className="mt-2 font-serif text-xl font-bold text-[#203d36]">MID-TERM EXAMINATION</h2>
                <p className="mt-1 text-[10px] text-[#67756f]">SCIENCE  ·  GRADE 8  ·  60 MINUTES</p>
              </div>
              <div className="mt-4 flex justify-between text-[9px] text-[#68766f]"><span>Name: __________________</span><span>Score: ____ / 40</span></div>
              <div className="mt-6 space-y-5 text-[10px] leading-5 text-[#354841]">
                <div><div className="flex justify-between font-semibold"><span>1. Explain how plants make their food.</span><span>[4]</span></div><div className="mt-2 space-y-2"><div className="h-px bg-[#e2e8e2]" /><div className="h-px bg-[#e2e8e2]" /><div className="h-px bg-[#e2e8e2]" /></div></div>
                <div><div className="flex justify-between font-semibold"><span>2. Choose the correct answer.</span><span>[2]</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-[9px] text-[#64736c]"><span>A. Evaporation</span><span>B. Photosynthesis</span><span>C. Condensation</span><span>D. Respiration</span></div></div>
              </div>
              <div className="mt-7 flex items-center justify-between border-t border-[#e1e6e0] pt-3 text-[8px] uppercase tracking-[0.12em] text-[#718079]"><span>Springfield Academy</span><span>Page 1 of 3</span></div>
            </article>
            <div className="mt-4 flex items-center justify-between rounded-md bg-white/75 px-4 py-3">
              <div><p className="text-xs font-semibold text-[#29443d]">Your school format</p><p className="mt-0.5 text-[10px] text-[#728078]">Applied consistently to every exam</p></div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dcebe2] text-sm font-bold text-[#176c5c]" aria-hidden="true">✓</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#dde3da] bg-[#fffefa]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8 lg:px-12">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a44f36]">01 / Capture</p><h2 className="mt-2 text-base font-semibold text-[#23443b]">Start with the pages you have</h2><p className="mt-1 text-sm leading-6 text-[#64736c]">Photograph handwritten questions and bring them into one organised exam.</p></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a44f36]">02 / Review</p><h2 className="mt-2 text-base font-semibold text-[#23443b]">Keep every detail in your hands</h2><p className="mt-1 text-sm leading-6 text-[#64736c]">Check the extracted questions, marks and layout before anything is final.</p></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#a44f36]">03 / Print</p><h2 className="mt-2 text-base font-semibold text-[#23443b]">Deliver a consistent paper</h2><p className="mt-1 text-sm leading-6 text-[#64736c]">Use your school template to prepare clean, classroom-ready exam documents.</p></div>
        </div>
      </section>
      <footer className="border-t border-[#dde3da] px-5 py-5 text-center text-xs text-[#77847d]">Scribe · Exam preparation for schools</footer>
    </main>
  );
}
