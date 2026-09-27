import { z } from "zod";
import { env } from "@/lib/env";
import type { ExtractedQuestion, ExtractionResult, ExtractionService } from "../interface";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Keep under typical serverless action limits (60s). The action also uploads
// first, so the model call itself must finish well before that.
const REQUEST_TIMEOUT_MS = 55_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [4000, 8000];

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

  if (arrayStart !== -1 && (start === -1 || arrayStart < start)) {
    const arrayEnd = candidate.lastIndexOf("]");
    if (arrayEnd > arrayStart) {
      return JSON.parse(candidate.slice(arrayStart, arrayEnd + 1));
    }
    return JSON.parse(candidate.slice(arrayStart));
  }

  if (start !== -1) {
    const end = candidate.lastIndexOf("}");
    if (end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
  }

  // Last resort: let it throw with a clear path to the friendly message.
  return JSON.parse(candidate);
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

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Extraction is not configured correctly. Check OPENROUTER_API_KEY and try again."
      );
    }

    const rateLimited = response.status === 429 || response.status === 402;
    const transient =
      response.status === 500 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;

    if ((rateLimited || transient) && attempt < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 8000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.complete(body, attempt + 1);
    }

    if (rateLimited) {
      throw new Error(
        "The free extraction service is busy right now. Please wait a minute and try again with fewer pages."
      );
    }

    if (!response.ok) {
      throw new Error(
        `Processing failed (status ${response.status}). Please try again in a moment.`
      );
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
