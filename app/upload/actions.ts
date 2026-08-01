"use server"

import { PDFParse } from "pdf-parse"
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db-config"
import { documents, pdfFiles } from "@/lib/db-schema"
import { generateEmbeddings } from "@/lib/embeddings"
import { chunkContent } from "@/lib/chunking"
import { chooseStrategy } from "@/lib/pdf-strategy"

export async function getCurrentDocument() {
  const { userId } = await auth()
  if (!userId) return null

  const [row] = await db
    .select({ fileName: pdfFiles.fileName, strategy: pdfFiles.strategy })
    .from(pdfFiles)
    .where(eq(pdfFiles.userId, userId))
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
    const strategy = chooseStrategy(cleanedText)

    await db.delete(documents).where(eq(documents.userId, userId))

    if (strategy === "rag") {
      const chunks = await chunkContent(cleanedText)

      if (chunks.length >= 100) {
        return {
          success: false,
          error: "El documento es demasiado grande para procesarlo en este momento. Intenta subir un documento más corto."
        }
      }

      const embeddings = await generateEmbeddings(chunks)

      const records = chunks.map((chunk, index) => ({
        userId,
        fileName: file.name,
        content: chunk,
        embedding: embeddings[index]
      }))

      await db.insert(documents).values(records)

      await db.insert(pdfFiles)
        .values({ userId, fileName: file.name, strategy: "rag", fileData: null })
        .onConflictDoUpdate({
          target: pdfFiles.userId,
          set: { fileName: file.name, strategy: "rag", fileData: null }
        })

      return {
        success: true,
        message: `"${file.name}" cargado con ${records.length} fragmentos buscables`
      }
    }

    const fileData = buffer.toString("base64")

    await db.insert(pdfFiles)
      .values({ userId, fileName: file.name, strategy: "full", fileData })
      .onConflictDoUpdate({
        target: pdfFiles.userId,
        set: { fileName: file.name, strategy: "full", fileData }
      })

    return {
      success: true,
      message: `"${file.name}" cargado en modo lectura completa`
    }
  } catch (error) {
    console.error("PDF processing error", error)
    return {
      success: false,
      error: "Failed to process PDF"
    }
  }
}
