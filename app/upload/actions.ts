"use server"

import { PDFParse } from "pdf-parse"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db-config"
import { documents } from "@/lib/db-schema"
import { generateEmbeddings } from "@/lib/embeddings"
import { chunkContent } from "@/lib/chunking"

export async function processPdfFile(formData:FormData) {
  try {
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

    const chunks = await chunkContent(data.text)
    const embeddings = await generateEmbeddings(chunks)

    const records = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index]
    }))

    await db.insert(documents).values(records)

    return {
      success: true,
      message: `Created ${records.length} searchable chunks`
    }
  } catch (error) {
    console.error("PDF processing error", error)
    return {
      success: false,
      error: "Failed to process PDF"
    }
  }
}