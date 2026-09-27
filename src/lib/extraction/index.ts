import { env } from "@/lib/env";
import { ExtractionService } from "./interface";
import { MockExtractionProvider } from "./providers/mock";
import { OpenRouterExtractionProvider } from "./providers/openrouter";

export function getExtractionProvider(): ExtractionService {
  switch (env.EXTRACTION_PROVIDER) {
    case "openrouter":
      return new OpenRouterExtractionProvider();
    case "mock":
    default:
      return new MockExtractionProvider();
  }
}
