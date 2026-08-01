// ~10k tokens of extracted text. Gemini's context window is much larger than
// this, but the full PDF gets resent on every chat turn with no caching in
// place yet, so this keeps that cost/latency reasonable.
export const FULL_CONTEXT_CHAR_THRESHOLD = 40_000;

export type PdfStrategy = "rag" | "full";

export function chooseStrategy(cleanedText: string): PdfStrategy {
  console.log('length', cleanedText.length)
  return cleanedText.length <= FULL_CONTEXT_CHAR_THRESHOLD ? "full" : "rag";
}
