import { ExtractionResult, ExtractionService } from "../interface";

export class MockExtractionProvider implements ExtractionService {
  async extract(imageUris: string[]): Promise<ExtractionResult> {
    return {
      questions: [
        {
          id: crypto.randomUUID(),
          text: "Question 1: Explain the main causes of the French Revolution.",
          marks: 5,
          order: 1,
          pageNumber: 1,
        },
        {
          id: crypto.randomUUID(),
          text: "Question 2: Describe the role of Napoleon in European history.",
          marks: 10,
          order: 2,
          pageNumber: 1,
        },
      ],
      pagesCount: imageUris.length,
      provider: "mock",
    };
  }
}
