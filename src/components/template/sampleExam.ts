export type PreviewSubpart = {
  text: string;
  marks: number;
};

export type PreviewQuestion = {
  text: string;
  marks: number;
  options?: string[];
  subparts?: PreviewSubpart[];
};

export type PreviewBlock =
  | { type: "instructions"; text: string }
  | { type: "section"; title: string; instructions?: string }
  | { type: "passage"; title?: string; content: string }
  | { type: "question"; question: PreviewQuestion };

export type PreviewExam = {
  heading: string;
  titleBlock: Partial<Record<TitleBlockLabel, string>>;
  blocks: PreviewBlock[];
  pageBreaksAfter?: number[];
};

type TitleBlockLabel =
  | "subject"
  | "class"
  | "term"
  | "date"
  | "duration"
  | "totalMarks";

export const sampleExam: PreviewExam = {
  heading: "Term 1 Examination",
  titleBlock: {
    subject: "Mathematics",
    class: "Grade 7 – A",
    term: "Term 1",
    date: "18 September 2026",
    duration: "1 hour 30 minutes",
    totalMarks: "60",
  },
  blocks: [
    { type: "instructions", text: "Answer all questions. Show all working where required." },
    { type: "section", title: "Section A", instructions: "Answer all questions in this section." },
    {
      type: "question",
      question: {
        text: "Which of the following is the correct value of x when 2x + 6 = 14?",
        marks: 1,
        options: ["x = 2", "x = 4", "x = 6", "x = 8"],
      },
    },
    {
      type: "question",
      question: {
        text: "Work out the following.",
        marks: 4,
        subparts: [
          { text: "Simplify 3x + 2x − x", marks: 2 },
          { text: "Solve for y: 3y = 12", marks: 2 },
        ],
      },
    },
    {
      type: "passage",
      title: "Reading Passage",
      content:
        "The Industrial Revolution began in Britain in the late 18th century and spread to other parts of the world. It marked a major turning point in history; almost every aspect of daily life was influenced in some way.",
    },
    {
      type: "question",
      question: {
        text: "According to the passage, where did the Industrial Revolution begin?",
        marks: 2,
      },
    },
    { type: "section", title: "Section B", instructions: "Answer any THREE questions from this section." },
    {
      type: "question",
      question: {
        text: "Describe the causes and consequences of the French Revolution.",
        marks: 10,
      },
    },
  ],
  pageBreaksAfter: [2],
};