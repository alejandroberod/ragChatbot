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
import { openai } from "@ai-sdk/openai";
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
          .describe("The search query to find relevant information"),
      }),
      execute: async ({ query }) => {
        try {
          console.log('Query', query)
          const results = await searchDocuments(userId, query, 3, 0.15);

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
      model: openai("gpt-4.1-mini"),
      messages: await convertToModelMessages(messages),
      tools: createTools(userId),
      system: `You are a helpful assistant with access to a knowledge base. 
          When users ask questions, search the knowledge base for relevant information.
          Always search before answering if the question might relate to uploaded documents.
          Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`,
      stopWhen: stepCountIs(2)
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        messageMetadata: ({ part }) => {
          if (part.type == "finish") {
            return {
              usage: part.totalUsage,
              model: "gpt-4.1-mini",
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
