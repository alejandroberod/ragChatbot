import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "./db-config";
import { documents } from "./db-schema";
import { generateEmbedding } from "./embeddings";

export async function searchDocuments(userId: string, query: string, limit: number = 5, threshold: number = 0.3) {
  const embedding = await generateEmbedding(query)

  const similarity = sql<number>`1 - (${cosineDistance(
    documents.embedding,
    embedding
  )})`;

  const similarDocuments = await db.select({
    id: documents.id,
    content: documents.content,
    similarity
  })
  .from(documents)
  .where(and(eq(documents.userId, userId), gt(similarity, threshold)))
  .orderBy(desc(similarity))
  .limit(limit)

  console.log('Similar', similarDocuments)


  return similarDocuments
}