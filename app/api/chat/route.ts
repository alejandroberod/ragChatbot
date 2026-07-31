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
          const results = await searchDocuments(userId, query, 3, 0.5);

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

    const result = streamText({
      model: google("gemini-3.5-flash-lite"),
      messages: await convertToModelMessages(messages),
      tools: createTools(userId),
      system: `You are a helpful assistant with access to a knowledge base.
          When users ask questions, search the knowledge base for relevant information.
          Always search before answering if the question might relate to uploaded documents.
          When calling searchKnowledgeBase, formulate a clear, complete search query rather than repeating the user's message verbatim.
          Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.
          Answer depending on the input language, if the question is in spanish, answer in spanish, if the question is in english answer in englis`,
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
