import { pgTable, serial, text, vector, index, timestamp } from "drizzle-orm/pg-core";

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

export const pdfFiles = pgTable("pdf_files", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  fileName: text("file_name").notNull(),
  strategy: text("strategy", { enum: ["rag", "full"] }).notNull(),
  // base64-encoded PDF bytes, only populated when strategy = 'full'
  fileData: text("file_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export type InsertPdfFile = typeof pdfFiles.$inferInsert
export type SelectPdfFile = typeof pdfFiles.$inferSelect