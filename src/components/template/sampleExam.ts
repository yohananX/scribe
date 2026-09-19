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

export type PreviewExam = {
  heading: string;
  instructions: string;
  titleBlock: Partial<Record<TitleBlockLabel, string>>;
  questions: PreviewQuestion[];
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
  instructions:
    "Answer all questions. Write your answers in the spaces provided. Show all working where required.",
  titleBlock: {
    subject: "Mathematics",
    class: "Grade 7 – A",
    term: "Term 1",
    date: "18 September 2026",
    duration: "1 hour 30 minutes",
    totalMarks: "60",
  },
  questions: [
    {
      text: "Which of the following is the correct value of x when 2x + 6 = 14?",
      marks: 1,
      options: ["x = 2", "x = 4", "x = 6", "x = 8"],
    },
    {
      text: "Work out the following.",
      marks: 4,
      subparts: [
        { text: "Simplify 3x + 2x − x", marks: 2 },
        { text: "Solve for y: 3y = 12", marks: 2 },
      ],
    },
    {
      text: "The marks below show scores in a spelling test for 20 learners.",
      marks: 3,
      subparts: [
        { text: "Complete the frequency table for this data.", marks: 2 },
        { text: "How many learners scored 7 or more?", marks: 1 },
      ],
    },
    {
      text: "Explain in your own words the difference between the mean and the median of a set of numbers.",
      marks: 2,
    },
  ],
  pageBreaksAfter: [2],
};