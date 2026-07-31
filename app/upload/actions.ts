"use server"

import { PDFParse } from "pdf-parse"
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db-config"
import { documents } from "@/lib/db-schema"
import { generateEmbeddings } from "@/lib/embeddings"
import { chunkContent } from "@/lib/chunking"

export async function getCurrentDocument() {
  const { userId } = await auth()
  if (!userId) return null

  const [row] = await db
    .select({ fileName: documents.fileName })
    .from(documents)
    .where(eq(documents.userId, userId))
    .limit(1)

  return row ?? null
}

function cleanPdfText(text: string): string {
  return text
    .replace(/-\n/g, "")
    .replace(/(?<!\n)\n(?!\n)/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
}

export async function processPdfFile(formData: FormData) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: "Not authorized"
      }
    }

    const file = formData.get("pdf") as File

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const parser = new PDFParse({ data: buffer })
    const data = await parser.getText()

    if (!data.text || data.text.trim().length == 0) {
      return {
        success: false,
        error: "No text found in PDF"
      }
    }

    const cleanedText = cleanPdfText(data.text)
    const chunks = await chunkContent(cleanedText)
    const embeddings = await generateEmbeddings(chunks)

    const records = chunks.map((chunk, index) => ({
      userId,
      fileName: file.name,
      content: chunk,
      embedding: embeddings[index]
    }))

    await db.delete(documents).where(eq(documents.userId, userId))
    await db.insert(documents).values(records)

    return {
      success: true,
      message: `"${file.name}" cargado con ${records.length} fragmentos buscables`
    }
  } catch (error) {
    console.error("PDF processing error", error)
    return {
      success: false,
      error: "Failed to process PDF"
    }
  }
}
