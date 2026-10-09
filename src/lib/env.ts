import { z } from "zod";

const envSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    EXTRACTION_PROVIDER: z.enum(["mock", "openrouter"]).default("mock"),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_VISION_MODEL: z
      .string()
      .min(1)
      .default("openrouter/free"),
  })
  .superRefine((value, ctx) => {
    if (value.EXTRACTION_PROVIDER === "openrouter" && !value.OPENROUTER_API_KEY) {
      ctx.addIssue({
        code: "custom",
        message:
          "OPENROUTER_API_KEY is required when EXTRACTION_PROVIDER is 'openrouter'.",
      });
    }
  });

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  EXTRACTION_PROVIDER: process.env.EXTRACTION_PROVIDER,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_VISION_MODEL: process.env.OPENROUTER_VISION_MODEL,
});
