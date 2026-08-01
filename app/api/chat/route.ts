import {
  streamText,
  UIMessage,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStreamResponse,
  tool,
  InferUITools,
  UIDataTypes,
  stepCountIs
} from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db-config";
import { pdfFiles } from "@/lib/db-schema";
import { searchDocuments } from "@/lib/search";

function createTools(userId: string) {
  return {
    searchKnowledgeBase: tool({
      description: "Search the knowledge base for relevant information",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "A self-contained, semantically rich search query. Rewrite the user's question " +
            "as a full sentence or statement optimized for semantic search: resolve pronouns " +
            "and references using the conversation context, expand abbreviations, and include " +
            "relevant keywords the user implied but didn't state explicitly. Do not just copy " +
            "the user's raw message."
          ),
      }),
      execute: async ({ query }) => {
        try {
          console.log('Query', query)
          const results = await searchDocuments(userId, query, 4, 0.5);
          console.log("RESULTS", results)

          if (results.length == 0) {
            return "No relevant information found in the knowledge base";
          }
          const formattedResults = results
            .map((r, i) => `[${i + 1} ${r.content}]`)
            .join("\n\n");
          return formattedResults
        } catch (error) {
          console.error("Search error: ", error);
          return "Error searching the knowledge base";
        }
      },
    }),
  };
}

export type ChatTools = InferUITools<ReturnType<typeof createTools>>
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages }: { messages: ChatMessage[] } = await req.json();

    const [fileRow] = await db
      .select()
      .from(pdfFiles)
      .where(eq(pdfFiles.userId, userId))
      .limit(1);

    const modelMessages = await convertToModelMessages(messages);

    const isFullContext = fileRow?.strategy === "full" && fileRow.fileData;

    const finalMessages = isFullContext
      ? [
          {
            role: "user" as const,
            content: [
              {
                type: "file" as const,
                data: Buffer.from(fileRow.fileData!, "base64"),
                mediaType: "application/pdf",
                filename: fileRow.fileName,
              },
              {
                type: "text" as const,
                text: "Este es el documento de referencia completo para esta conversación.",
              },
            ],
          },
          {
            role: "assistant" as const,
            content: "Entendido, tengo el documento completo y responderé basándome en su contenido.",
          },
          ...modelMessages,
        ]
      : modelMessages;

    const mathFormattingInstructions = `If you need to write a math formula, put it in its own block delimited by $$...$$. Never use \\( \\), \\[ \\], or a single $ for math. Dollar signs used for money (e.g. $60,801) are plain text — write them normally and never escape them.`;

    const system = isFullContext
      ? `You are a helpful, general-purpose assistant that also has the user's full reference document attached at the start of this conversation.
          If the question relates to that document (including any tables, charts or images in it), base your answer on it and don't fabricate information that isn't there.
          If the question is unrelated to the document (general knowledge, casual conversation, etc.), just answer normally using what you know — never refuse or claim you can't answer just because it isn't in the document.
          Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the document.
          Answer depending on the input language, if the question is in spanish, answer in spanish, if the question is in english answer in english.
          ${mathFormattingInstructions}`
      : `You are a helpful, general-purpose assistant that also has access to a knowledge base built from a document the user uploaded.
          When a question might relate to that document, call searchKnowledgeBase first and base your answer on the results.
          When calling searchKnowledgeBase, formulate a clear, complete search query rather than repeating the user's message verbatim.
          If the question is unrelated to the document, or the search returns nothing relevant, just answer normally using what you know — never refuse or claim you can't answer just because it wasn't in the search results.
          Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.
          Answer depending on the input language, if the question is in spanish, answer in spanish, if the question is in english answer in english.
          ${mathFormattingInstructions}`;

    const result = streamText({
      model: google("gemini-3.5-flash-lite"),
      messages: finalMessages,
      tools: isFullContext ? {} : createTools(userId),
      system,
      stopWhen: stepCountIs(3)
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        messageMetadata: ({ part }) => {
          if (part.type == "finish") {
            return {
              usage: part.totalUsage,
              model: "gemini-3.6-flash",
            };
          }
        },
      }),
    });
  } catch (error) {
    console.error("Error streaming chat completion", error);
    return new Response("Failed to stream chat completion", { status: 500 });
  }
}
