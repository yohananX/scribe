import { env } from "@/lib/env";
import { ExtractionService } from "./interface";
import { MockExtractionProvider } from "./providers/mock";

export function getExtractionProvider(): ExtractionService {
  switch (env.EXTRACTION_PROVIDER) {
    case "mock":
      return new MockExtractionProvider();
    default:
      return new MockExtractionProvider();
  }
}
