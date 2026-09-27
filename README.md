# Scribe — handwritten exams to print-ready documents

Teachers photograph handwritten exam pages. Scribe extracts the questions,
lets teachers review/edit them, then renders a school-branded preview ready
to print or save as PDF.

## MVP flow

`/signup` → `/onboarding` (create school) → `/exams/new` (photo capture) →
`/exams/[id]/review` (edit + save) → `/exams/[id]/preview` (print).

## Setup

1. `cp .env.example .env.local` and fill in Supabase keys.
   Use `EXTRACTION_PROVIDER=mock` for offline demos,
   `openrouter` + `OPENROUTER_API_KEY` for real extraction.
2. Supabase SQL Editor: run the base schema, then
   `supabase/migrations/20260927001_save_exam_atomic.sql`.
3. Supabase Auth → URL Configuration: set Site URL, and whitelist
   `http://localhost:3000/auth/callback` plus your prod
   `https://your-domain/auth/callback`.
4. `npm install`, `npm run dev`, open http://localhost:3000.

## Checks

`npm run typecheck` must pass. `npm run lint` must have 0 errors
(6 pre-existing `<img>` warnings in preview/capture are accepted).

## Limits (see `src/lib/exam-limits.ts`)

Max 10 pages and 30MB total per extraction run, 8MB per photo,
JPG/PNG only (HEIC rejected with a friendly message).
