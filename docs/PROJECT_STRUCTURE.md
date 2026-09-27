# Scribe – Project Structure

## Root
- `.env.example` – required environment variables
- `docs/schema.sql` – Supabase Postgres schema + RLS policies
- `src/` – Next.js app source

## `src/`
- `app/` – App Router routes
- `lib/` – shared utilities and clients
- `types/` – shared TypeScript types

## `src/lib/`
- `env.ts` – validated env schema
- `supabase/`
  - `client.ts` – browser client
  - `server.ts` – server component client
  - `middleware.ts` – middleware session helper
- `extraction/`
  - `interface.ts` – extraction service contract
  - `providers/` – provider implementations
  - `index.ts` – provider factory

## `src/app/`
- `page.tsx` – landing/home
- `layout.tsx` – root layout
- `globals.css` – design system base
- `api/auth/`
  - `login/route.ts` – magic link request
  - `logout/route.ts` – sign out
- `auth/callback/route.ts` – OTP callback

## Deployment
- Host: Vercel
- Data: Supabase (Postgres, Auth, Storage)
- Build: `npm run build`
- Dev: `npm run dev`

## Auth
- Magic Link and Email/Password via Supabase Auth
- Middleware keeps session refreshed across navigations

## Extraction
- Abstracted behind `ExtractionService`
- Providers: `OpenRouterExtractionProvider` (free vision LLM via OpenRouter),
  `MockExtractionProvider` (fixed sample questions, for offline development)
- Swap by changing `EXTRACTION_PROVIDER` env value (`openrouter` | `mock`)
- OpenRouter needs `OPENROUTER_API_KEY`; the model is set with
  `OPENROUTER_VISION_MODEL` (default: `google/gemma-4-26b-a4b-it:free`)

## RLS
- Organisation and teacher isolation enforced in Postgres
- See `docs/schema.sql` for policies
