import type { ExtractedBlock, ExtractionResult, ExtractionService } from "../interface";

const mockBlocks: ExtractedBlock[] = [
  {
    type: "instructions",
    id: "mock-1",
    order: 1,
    text: "Answer all questions. Show all working where required.",
  },
  {
    type: "section",
    id: "mock-2",
    order: 2,
    title: "Section A",
    instructions: "Answer all questions in this section. Each question carries the marks shown.",
  },
  {
    type: "question",
    id: "mock-3",
    order: 3,
    questionText: "Which of the following is the capital city of France?",
    marks: 1,
    options: ["Berlin", "Paris", "Madrid", "Rome"],
    pageNumber: 1,
  },
  {
    type: "question",
    id: "mock-4",
    order: 4,
    questionText: "Work out the following.",
    marks: 4,
    subparts: [
      { text: "a) Simplify 3x + 2x − x", marks: 2 },
      { text: "b) Solve for y: 3y = 12", marks: 2 },
    ],
    pageNumber: 1,
  },
  {
    type: "passage",
    id: "mock-5",
    order: 5,
    title: "Reading Passage",
    content:
      "The Industrial Revolution began in Britain in the late 18th century and spread to other parts of the world. It marked a major turning point in history; almost every aspect of daily life was influenced in some way. In particular, average income and population began to exhibit unprecedented sustained growth.",
    pageNumber: 1,
  },
  {
    type: "question",
    id: "mock-6",
    order: 6,
    questionText: "According to the passage, where did the Industrial Revolution begin?",
    marks: 2,
    pageNumber: 1,
  },
  {
    type: "question",
    id: "mock-7",
    order: 7,
    questionText: "Explain in your own words the difference between the mean and the median of a set of numbers.",
    marks: 2,
    pageNumber: 1,
  },
  {
    type: "section",
    id: "mock-8",
    order: 8,
    title: "Section B",
    instructions: "Answer any THREE questions from this section.",
  },
  {
    type: "question",
    id: "mock-9",
    order: 9,
    questionText: "Describe the causes and consequences of the French Revolution.",
    marks: 10,
    pageNumber: 2,
  },
  {
    type: "question",
    id: "mock-10",
    order: 10,
    questionText: "Choose the correct value of x when 2x + 6 = 14.",
    marks: 1,
    options: ["x = 2", "x = 4", "x = 6", "x = 8"],
    pageNumber: 2,
  },
];

export class MockExtractionProvider implements ExtractionService {
  async extract(imageUris: string[]): Promise<ExtractionResult> {
    const pageCount = Math.max(1, imageUris.length);

    return {
      blocks: mockBlocks,
      pagesCount: pageCount,
      provider: "mock",
    };
  }
}