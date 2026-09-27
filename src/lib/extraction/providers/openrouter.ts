import { z } from "zod";
import { env } from "@/lib/env";
import type { ExtractedQuestion, ExtractionResult, ExtractionService } from "../interface";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 90_000;

const extractedQuestionSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  marks: z.number().int().min(0).max(200).nullable().optional(),
  options: z.array(z.string().trim().max(200)).max(8).nullable().optional(),
  pageNumber: z.number().int().min(1).nullable().optional(),
});

const payloadSchema = z.union([
  z.object({ questions: z.array(extractedQuestionSchema).min(1).max(200) }),
  z.array(extractedQuestionSchema).min(1).max(200),
]);

const SYSTEM_PROMPT = [
  "You transcribe handwritten school exam pages into structured data.",
  "Read every page image in order and extract each numbered question.",
  "Split labelled sub-parts (a, b, c or i, ii, iii) into separate questions,",
  "prefixing the text with the part label, e.g. \"b) Solve for y: 3y = 12\".",
  "Copy multiple-choice options verbatim when present.",
  "Record the marks for a question only when they are visible on the page,",
  "otherwise use null. Never invent questions, options or marks.",
  "Respond with raw JSON only, no markdown fences, no commentary, using exactly this shape:",
  '{"questions": [{"text": "...", "marks": 5, "options": ["..."] or null, "pageNumber": 1}]}',
].join(" ");

function extractJsonPayload(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const arrayStart = candidate.indexOf("[");

  if (start === -1 || (arrayStart !== -1 && arrayStart < start)) {
    return JSON.parse(candidate.slice(arrayStart));
  }

  return JSON.parse(candidate.slice(start, candidate.lastIndexOf("}") + 1));
}

export class OpenRouterExtractionProvider implements ExtractionService {
  async extract(imageUris: string[]): Promise<ExtractionResult> {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error(
        "Extraction is not configured. Add OPENROUTER_API_KEY to the environment."
      );
    }

    if (imageUris.length === 0) {
      throw new Error("Add at least one page before processing.");
    }

    const content: unknown[] = [
      {
        type: "text",
        text: `Transcribe these ${imageUris.length} handwritten exam page(s) in order. Page 1 is first.`,
      },
      ...imageUris.map((url) => ({
        type: "image_url",
        image_url: { url },
      })),
    ];

    const body = JSON.stringify({
      model: env.OPENROUTER_VISION_MODEL,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
    });

    const rawText = await this.complete(body);
    let parsed: z.infer<typeof payloadSchema>;

    try {
      parsed = payloadSchema.parse(extractJsonPayload(rawText));
    } catch {
      throw new Error(
        "The pages could not be read clearly. Try sharper photos with good lighting, then process again."
      );
    }

    const items = Array.isArray(parsed) ? parsed : parsed.questions;
    const pageCount = imageUris.length;

    const questions: ExtractedQuestion[] = items.map((item, index) => ({
      id: crypto.randomUUID(),
      text: item.text,
      marks: item.marks ?? null,
      options:
        item.options && item.options.length > 0
          ? item.options.filter((option) => option.length > 0)
          : undefined,
      order: index + 1,
      pageNumber:
        item.pageNumber && item.pageNumber >= 1 && item.pageNumber <= pageCount
          ? item.pageNumber
          : Math.min(pageCount, Math.floor((index * pageCount) / items.length) + 1),
    }));

    return {
      questions,
      pagesCount: pageCount,
      provider: `openrouter:${env.OPENROUTER_VISION_MODEL}`,
    };
  }

  private async complete(body: string, attempt = 1): Promise<string> {
    let response: Response;

    try {
      response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "X-Title": "Scribe",
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error(
          "Reading the pages took too long. Try again with fewer pages at once."
        );
      }
      throw new Error("Network issue. Please check your connection and try again.");
    }

    if (response.status === 401) {
      throw new Error(
        "Extraction is not configured correctly. Check OPENROUTER_API_KEY and try again."
      );
    }

    if ((response.status === 429 || response.status === 402) && attempt === 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return this.complete(body, attempt + 1);
    }

    if (response.status === 429 || response.status === 402) {
      throw new Error(
        "The free extraction service is busy right now. Please wait a minute and try again."
      );
    }

    if (!response.ok) {
      throw new Error("Processing failed. Please try again in a moment.");
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string | unknown[] } }[];
    };

    const messageContent = data.choices?.[0]?.message?.content;
    const text = Array.isArray(messageContent)
      ? messageContent
          .filter(
            (part): part is { type: string; text?: string } =>
              typeof part === "object" && part !== null
          )
          .map((part) => part.text ?? "")
          .join("")
      : (messageContent ?? "");

    if (!text.trim()) {
      throw new Error(
        "The pages came back empty. Try sharper photos with good lighting, then process again."
      );
    }

    return text;
  }
}
