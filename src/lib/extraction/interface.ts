export interface ExtractedBlock {
  type: "instructions" | "section" | "passage" | "question";
  id: string;
  order: number;
  // instructions
  text?: string;
  // section / passage
  title?: string;
  // section
  instructions?: string;
  // passage
  content?: string;
  // question
  questionText?: string;
  marks?: number | null;
  options?: string[];
  subparts?: ExtractedSubpart[];
  pageNumber?: number | null;
}

export interface ExtractedSubpart {
  text: string;
  marks?: number | null;
}

export interface ExtractionResult {
  blocks: ExtractedBlock[];
  pagesCount: number;
  provider: string;
}

export interface ExtractionService {
  extract(imageUris: string[]): Promise<ExtractionResult>;
}
