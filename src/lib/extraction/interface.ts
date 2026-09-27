export interface ExtractedQuestion {
  id: string;
  text: string;
  marks?: number | null;
  options?: string[];
  order: number;
  pageNumber: number;
}

export interface ExtractionResult {
  questions: ExtractedQuestion[];
  pagesCount: number;
  provider: string;
}

export interface ExtractionService {
  extract(imageUris: string[]): Promise<ExtractionResult>;
}
