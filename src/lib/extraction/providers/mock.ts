import { ExtractionResult, ExtractionService } from "../interface";

type MockQuestion = {
  text: string;
  marks: number;
  options?: string[];
};

const FREE_TEXT: MockQuestion[] = [
  { text: "Explain the main causes of the French Revolution.", marks: 5 },
  { text: "Describe the role of water in the life cycle of a plant.", marks: 4 },
  { text: "What is the difference between a noun and an adjective? Give an example of each.", marks: 3 },
  { text: "Solve for x: 3(x + 4) = 27. Show all your working.", marks: 4 },
  { text: "List three ways in which renewable energy benefits the environment.", marks: 3 },
  { text: "Summarise the main events of the chapter in three short sentences.", marks: 6 },
];

const WITH_OPTIONS: MockQuestion[] = [
  {
    text: "Which of the following is the capital city of France?",
    marks: 1,
    options: ["Berlin", "Paris", "Madrid", "Rome"],
  },
  {
    text: "Choose the correct value of x when 2x + 6 = 14.",
    marks: 1,
    options: ["x = 2", "x = 4", "x = 6", "x = 8"],
  },
  {
    text: "Which organ pumps blood around the human body?",
    marks: 1,
    options: ["Lungs", "Liver", "Heart", "Kidneys"],
  },
];

export class MockExtractionProvider implements ExtractionService {
  async extract(imageUris: string[]): Promise<ExtractionResult> {
    const pageCount = Math.max(1, imageUris.length);
    const questions = [];

    for (let index = 0; index < pageCount; index += 1) {
      const withOptions = WITH_OPTIONS[index % WITH_OPTIONS.length];
      const freeText = FREE_TEXT[index % FREE_TEXT.length];
      const useOptions = index === 0;

      questions.push({
        id: crypto.randomUUID(),
        text: useOptions ? withOptions.text : freeText.text,
        marks: useOptions ? withOptions.marks : freeText.marks,
        options: useOptions ? withOptions.options : undefined,
        order: index + 1,
        pageNumber: index + 1,
      });
    }

    return {
      questions,
      pagesCount: pageCount,
      provider: "mock",
    };
  }
}