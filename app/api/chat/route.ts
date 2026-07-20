import { streamText, UIMessage, convertToModelMessages, toUIMessageStream, createUIMessageStreamResponse } from "ai";
import { openai } from "@ai-sdk/openai"

export async function POST(req:Request) {
  try {
    const { messages }:{ messages: UIMessage[] } = await req.json()

    const result = streamText({
      model: openai("gpt-4.1-mini"),
      messages: await convertToModelMessages(messages), //Probar
    })
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        messageMetadata: ({ part }) => {
          if (part.type == "finish") {
            return {
              usage: part.totalUsage,
              model: "gpt-4.1-mini"
            }
          }
        }
      })
    })
  } catch (error) {
    console.error('Error streaming chat completion', error)
    return new Response("Failed to stream chat completion", { status: 500 })
  }

}