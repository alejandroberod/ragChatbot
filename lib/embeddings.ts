import { embed, embedMany } from "ai";
import { google, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";

const embeddingModel = google.embedding("gemini-embedding-2");

// Gemini embeddings default to 3072 dims; truncate to 1536 to match the
// existing `documents.embedding` vector column (see lib/db-schema.ts).
const providerOptions = {
  google: {
    outputDimensionality: 1536,
  } satisfies GoogleEmbeddingModelOptions,
};

export async function generateEmbedding(text: string) {
  const input = text.replace("\n", "")

  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
    providerOptions
  })

  return embedding;
}

export async function generateEmbeddings(texts: string[]) {
  const inputs = texts.map((text) => text.replace("\n", ""))

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: inputs,
    providerOptions
  })

  return embeddings
}