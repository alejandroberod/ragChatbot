import { pgTable, serial, text, vector, index } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 })
}, (table) => [
  index("embeddingIndex").using(
    "hnsw",
    table.embedding.op("vector_cosine_ops")
  ),
  index("userIdIndex").on(table.userId)
])

export type InsertDocument = typeof documents.$inferInsert
export type SelectDocument = typeof documents.$inferSelect